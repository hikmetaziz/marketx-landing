"use client";

import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  adminApproveStoreApplication,
  adminGenerateClaimCode,
  adminGetStoreApplicationCreation,
} from "@/app/admin/stores/actions";
import {
  auditCustomerStoreConversationAccess,
  auditStoreSupportConversationAccess,
  fetchAdminCustomerStoreQueue,
  fetchAdminSupportConversations,
  fetchFirstConversationMessage,
} from "@/lib/messaging";
import {
  isStoreApplicationMessage,
  isStoreApplicationSubject,
  parseStoreApplicationMessage,
  type ParsedStoreApplication,
} from "@/lib/stores/parse-store-application";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import type {
  AdminCustomerStoreConversationSummary,
  AdminSupportConversationSummary,
} from "@/types/message";

const STATUS_LABELS: Record<string, string> = {
  open: "Açıq",
  waiting_customer: "Customer gözləyir",
  waiting_store: "Mağaza gözləyir",
  waiting_support: "Dəstək gözləyir",
  resolved: "Həll olunub",
  closed: "Bağlı",
};

const TOPIC_LABELS: Record<string, string> = {
  account: "Hesab",
  store_or_product_complaint: "Mağaza/ məhsul şikayəti",
  incorrect_price: "Yanlış qiymət",
  technical_problem: "Texniki problem",
  claim: "Tələb",
  product_import: "Məhsul importu",
  subscription: "Abunəlik",
  moderation: "Moderasiya",
  store_information: "Mağaza məlumatı",
  other: "Digər",
};

const TYPE_LABELS: Record<string, string> = {
  store_support: "Mağaza dəstəyi",
  customer_support: "Customer dəstəyi",
  customer_store: "Customer-mağaza",
};

function formatLastActivity(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;

  const color =
    status === "open" || status === "waiting_support"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : status === "resolved" || status === "closed"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${color}`}
    >
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-brand-primary-light/50 px-2 py-0.5 text-xs font-semibold text-brand-primary-dark">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function CountCard({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-xl border border-brand-border/80 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-muted">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-brand-text">
        {count}
      </p>
    </div>
  );
}

type NewStoreRequestFields = ParsedStoreApplication;

type SupportTab = "support" | "store_applications";

type CreatedStore = {
  name: string;
  storeId: string;
  storeCode: string;
  claimCode: string | null;
  claimCodeExpiresAt: string | null;
};

type StructuredStoreApplicationShadow = {
  store_name: string | null;
  category_name: string | null;
  city: string | null;
  description: string | null;
  address: string | null;
  working_days: string | null;
  working_hours: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  cover_url: string | null;
};

function normalizePhone(value: string): string {
  return value
    .replace(/\s/g, "")
    .replace(/^\+?994/, "0")
    .replace(/[^0-9]/g, "");
}

function normalizeShadowValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function readApplicationAssetUrl(body: string, label: string): string {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed.startsWith(label)) {
      continue;
    }

    const value = trimmed.slice(label.length).trim();

    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:"
        ? url.toString()
        : "";
    } catch {
      return "";
    }
  }

  return "";
}

function compareStructuredStoreApplicationShadow(
  structured: StructuredStoreApplicationShadow,
  legacy: ParsedStoreApplication,
  legacyAssetMessages: { body: unknown }[],
): string[] {
  const legacyImages = legacyAssetMessages.reduce(
    (current, message) => {
      if (typeof message.body !== "string") {
        return current;
      }

      return {
        logo_url:
          current.logo_url ||
          readApplicationAssetUrl(message.body, "Logo:"),
        cover_url:
          current.cover_url ||
          readApplicationAssetUrl(message.body, "Örtük şəkli:"),
      };
    },
    { logo_url: "", cover_url: "" },
  );

  const expectedWorkingHours =
    legacy.openingTime && legacy.closingTime
      ? `${legacy.openingTime}–${legacy.closingTime}`
      : "";

  const comparisons: Array<[string, string | null, string]> = [
    ["store_name", structured.store_name, legacy.name],
    ["category_name", structured.category_name, legacy.category],
    ["city", structured.city, legacy.city],
    ["description", structured.description, legacy.description],
    ["address", structured.address, legacy.address],
    ["working_days", structured.working_days, legacy.weekdays],
    ["working_hours", structured.working_hours, expectedWorkingHours],
    ["phone", structured.phone, legacy.phone],
    ["whatsapp", structured.whatsapp, legacy.whatsapp],
    ["email", structured.email, legacy.email],
    ["logo_url", structured.logo_url, legacyImages.logo_url],
    ["cover_url", structured.cover_url, legacyImages.cover_url],
  ];

  return comparisons
    .filter(
      ([, structuredValue, legacyValue]) =>
        normalizeShadowValue(structuredValue) !==
        normalizeShadowValue(legacyValue),
    )
    .map(([field]) => field);
}

export function AdminSupportPanel() {
  const { supabase, user } = useAuthUser();

  const [items, setItems] = useState<
    AdminSupportConversationSummary[]
  >([]);

  const [customerStoreQueue, setCustomerStoreQueue] = useState<
    AdminCustomerStoreConversationSummary[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [auditingId, setAuditingId] = useState("");
  const [auditedId, setAuditedId] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] =
    useState<SupportTab>("support");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<string>("all");
  const [typeFilter, setTypeFilter] =
    useState<string>("all");
  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [newStoreForm, setNewStoreForm] =
    useState<NewStoreRequestFields | null>(null);

  const [applicationLoading, setApplicationLoading] =
    useState(false);

  const [applicationLoadError, setApplicationLoadError] =
    useState<string | null>(null);

  const [applicationRawMessage, setApplicationRawMessage] =
    useState("");

  const [creatingStoreId, setCreatingStoreId] =
    useState<string | null>(null);

  const [generatingClaimCodeId, setGeneratingClaimCodeId] =
    useState<string | null>(null);

  const [
    createdStoresByConversation,
    setCreatedStoresByConversation,
  ] = useState<Record<string, CreatedStore>>({});

  const [createdStoreError, setCreatedStoreError] =
    useState<string | null>(null);

  const loadingRef = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      if (!supabase || !user || loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      if (!silent) {
        setLoading(true);
      }

      try {
        const [supportResult, queueResult] =
          await Promise.all([
            fetchAdminSupportConversations(supabase, {
              userId: user.id,
            }),
            fetchAdminCustomerStoreQueue(supabase),
          ]);

        setItems(supportResult.data);
        setCustomerStoreQueue(queueResult.data);

        setError(
          [supportResult.error, queueResult.error]
            .filter(Boolean)
            .join(" "),
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }

        loadingRef.current = false;
      }
    },
    [supabase, user],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    const interval = window.setInterval(() => {
      void load(true);
    }, 10000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisible,
    );

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        onVisible,
      );
    };
  }, [load, supabase, user]);

  const allRows = useMemo(() => {
    const support = items.map((item) => ({
      ...item,
      rowType: item.conversation_type,
      title:
        item.subject ??
        item.support_topic ??
        "Dəstək",
      subtitle:
        item.last_message_body ??
        item.store_name ??
        "MarktX",
      displayStatus: item.status,
      displayType: item.conversation_type,
      reportCount: 0,
    }));

    const queue = customerStoreQueue.map((item) => ({
      ...item,
      rowType: "customer_store" as const,
      title: item.store_name ?? "Mağaza",
      subtitle:
        item.listing_title ??
        item.subject ??
        "Customer-store söhbəti",
      displayStatus: item.status,
      displayType: "customer_store" as const,
      reportCount: item.report_count,
      conversation_type: "customer_store" as const,
    }));

    return [...support, ...queue];
  }, [items, customerStoreQueue]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return allRows.filter((row) => {
      const isStoreApplication =
        row.rowType === "customer_support" &&
        isStoreApplicationSubject(row.subject);

      const matchesTab =
        activeTab === "store_applications"
          ? isStoreApplication
          : !isStoreApplication;

      const matchesSearch =
        !term ||
        row.title.toLowerCase().includes(term) ||
        row.subtitle.toLowerCase().includes(term) ||
        row.id.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        row.displayStatus === statusFilter;

      const matchesType =
        activeTab === "store_applications" ||
        typeFilter === "all" ||
        row.displayType === typeFilter;

      return (
        matchesTab &&
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });
  }, [
    activeTab,
    allRows,
    search,
    statusFilter,
    typeFilter,
  ]);

  const selectedRow = useMemo(
    () =>
      allRows.find((row) => row.id === selectedId) ??
      null,
    [allRows, selectedId],
  );

  const isNewStoreRequest = useMemo(() => {
    if (
      !selectedRow ||
      selectedRow.rowType !== "customer_support"
    ) {
      return false;
    }

    const supportRow =
      selectedRow as AdminSupportConversationSummary & {
        rowType: string;
      };

    return isStoreApplicationSubject(
      supportRow.subject,
    );
  }, [selectedRow]);

  const createdStore = selectedId
    ? createdStoresByConversation[selectedId] ?? null
    : null;

  const creatingStore = Boolean(
    selectedId &&
      creatingStoreId === selectedId,
  );

  const generatingClaimCode = Boolean(
    selectedId &&
      generatingClaimCodeId === selectedId,
  );

  useEffect(() => {
    if (
      !supabase ||
      !selectedId ||
      !isNewStoreRequest
    ) {
      let cancelled = false;

      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        setNewStoreForm(null);
        setApplicationLoading(false);
        setApplicationLoadError(null);
        setApplicationRawMessage("");
        setCreatedStoreError(null);
      });

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    const loadOriginalApplication = async () => {
      setApplicationLoading(true);
      setApplicationLoadError(null);
      setApplicationRawMessage("");
      setNewStoreForm(null);
      setCreatedStoreError(null);

      const [messageResult, creationResult] =
        await Promise.all([
          fetchFirstConversationMessage(
            supabase,
            selectedId,
          ),
          adminGetStoreApplicationCreation(
            selectedId,
          ),
        ]);

      if (cancelled) {
        return;
      }

      if (creationResult.ok) {
        const creation =
          creationResult.creation;

        if (creation) {
          setCreatedStoresByConversation(
            (current) => ({
              ...current,
              [selectedId]: {
                name: creation.storeName,
                storeId: creation.storeId,
                storeCode:
                  creation.storeCode,
                claimCode: null,
                claimCodeExpiresAt: null,
              },
            }),
          );
        }
      } else {
        setCreatedStoreError(
          creationResult.error,
        );
      }

      const body =
        messageResult.data?.body ?? "";

      setApplicationRawMessage(body);

      if (messageResult.error) {
        setApplicationLoadError(
          "Müraciətin ilkin mesajı yüklənmədi.",
        );

        setApplicationLoading(false);
        return;
      }

      if (
        !messageResult.data ||
        !isStoreApplicationMessage(body)
      ) {
        setApplicationLoadError(
          "Müraciətin ilkin mesajı gözlənilən formatda deyil. Orijinal mesajı yoxlayın.",
        );

        setApplicationLoading(false);
        return;
      }

      const parsed =
        parseStoreApplicationMessage(body);

      if (!parsed) {
        setApplicationLoadError(
          "Müraciət məlumatları parse edilə bilmədi. Orijinal mesajı yoxlayın.",
        );

        setApplicationLoading(false);
        return;
      }

      setNewStoreForm(parsed);
      setApplicationLoading(false);

      if (process.env.NODE_ENV !== "production") {
        void (async () => {
          const [structuredResult, legacyAssetMessagesResult] =
            await Promise.all([
              supabase
                .from("store_applications")
                .select(
                  "store_name, category_name, city, description, address, working_days, working_hours, phone, whatsapp, email, logo_url, cover_url",
                )
                .eq("conversation_id", selectedId)
                .maybeSingle(),
              supabase
                .from("messages")
                .select("body")
                .eq("conversation_id", selectedId)
                .order("created_at", { ascending: true })
                .limit(20),
            ]);

          if (cancelled) {
            return;
          }

          if (structuredResult.error || !structuredResult.data) {
            return;
          }

          const mismatchingFields =
            compareStructuredStoreApplicationShadow(
              structuredResult.data as StructuredStoreApplicationShadow,
              parsed,
              legacyAssetMessagesResult.data ?? [],
            );

          if (mismatchingFields.length > 0) {
            console.warn(
              "Store application structured/legacy mismatch",
              {
                conversationId: selectedId,
                fields: mismatchingFields,
              },
            );
          }
        })();
      }
    };

    void loadOriginalApplication();

    return () => {
      cancelled = true;
    };
  }, [
    isNewStoreRequest,
    selectedId,
    supabase,
  ]);

  const storeApplications = items.filter(
    (item) =>
      item.conversation_type ===
        "customer_support" &&
      isStoreApplicationSubject(item.subject),
  );

  const customer = items.filter(
    (item) =>
      item.conversation_type ===
        "customer_support" &&
      !isStoreApplicationSubject(item.subject),
  );

  const store = items.filter(
    (item) =>
      item.conversation_type ===
      "store_support",
  );

  const handleAuditOpen = async (
    item: AdminCustomerStoreConversationSummary,
  ) => {
    if (!supabase || auditingId) {
      return;
    }

    setAuditingId(item.id);
    setAuditedId("");
    setError("");

    const result =
      await auditCustomerStoreConversationAccess(
        supabase,
        {
          conversationId: item.id,
          reason: item.queue_reason,
        },
      );

    setAuditingId("");

    if (result.error) {
      setError(result.error);
      return;
    }

    setAuditedId(item.id);
    setSelectedId(item.id);
  };

  const handleStoreSupportAuditOpen = async (
    item: AdminSupportConversationSummary,
  ) => {
    if (!supabase || auditingId) {
      return;
    }

    setAuditingId(item.id);
    setAuditedId("");
    setError("");

    const result =
      await auditStoreSupportConversationAccess(
        supabase,
        {
          conversationId: item.id,
          reason: "support_assignment",
        },
      );

    setAuditingId("");

    if (result.error) {
      setError(result.error);
      return;
    }

    setAuditedId(item.id);
    setSelectedId(item.id);
  };

  const handleApproveNewStore = async () => {
    if (
      !selectedId ||
      !newStoreForm ||
      creatingStore ||
      createdStore
    ) {
      return;
    }

    const name = newStoreForm.name.trim();
    const category =
      newStoreForm.category.trim();

    const phone = normalizePhone(
      newStoreForm.phone,
    );

    const whatsapp =
      newStoreForm.whatsapp.trim()
        ? normalizePhone(
            newStoreForm.whatsapp,
          )
        : "";

    const email =
      newStoreForm.email.trim();

    if (!name) {
      setCreatedStoreError(
        "Mağaza adını daxil edin.",
      );
      return;
    }

    if (!category) {
      setCreatedStoreError(
        "Kateqoriyanı daxil edin.",
      );
      return;
    }

    if (
      !/^0(?:10|50|51|55|60|70|77|99)\d{7}$/.test(
        phone,
      )
    ) {
      setCreatedStoreError(
        "Telefon nömrəsini düzgün daxil edin.",
      );
      return;
    }

    if (
      whatsapp &&
      !/^0(?:10|50|51|55|60|70|77|99)\d{7}$/.test(
        whatsapp,
      )
    ) {
      setCreatedStoreError(
        "WhatsApp nömrəsini düzgün daxil edin.",
      );
      return;
    }

    if (
      newStoreForm.openingTime >=
      newStoreForm.closingTime
    ) {
      setCreatedStoreError(
        "Açılış saatı bağlanış saatından əvvəl olmalıdır.",
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setCreatedStoreError(
        "E-poçt ünvanını düzgün daxil edin.",
      );
      return;
    }

    const conversationId = selectedId;

    setCreatingStoreId(conversationId);
    setCreatedStoreError(null);

    try {
      const result =
        await adminApproveStoreApplication(
          conversationId,
          {
            name,
            category,
            city:
              newStoreForm.city.trim(),
            contactPhone: phone,
            whatsappPhone: whatsapp,
            address:
              newStoreForm.address.trim(),
            description: [
              newStoreForm.description.trim(),
              newStoreForm.weekdays.trim() &&
                `İş günləri: ${newStoreForm.weekdays.trim()}`,
              `İş saatları: ${newStoreForm.openingTime}–${newStoreForm.closingTime}`,
              email &&
                `E-poçt: ${email}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        );

      if (!result.ok) {
        const created =
          result.storeCreated;

        if (created) {
          setCreatedStoresByConversation(
            (current) => ({
              ...current,
              [conversationId]: {
                name: created.storeName,
                storeId: created.storeId,
                storeCode:
                  created.storeCode,
                claimCode: null,
                claimCodeExpiresAt: null,
              },
            }),
          );
        }

        setCreatedStoreError(
          result.error,
        );

        return;
      }

      setCreatedStoresByConversation(
        (current) => ({
          ...current,
          [conversationId]: {
            name: result.storeName,
            storeId: result.storeId,
            storeCode: result.storeCode,
            claimCode: result.claimCode,
            claimCodeExpiresAt:
              result.claimCodeExpiresAt,
          },
        }),
      );
    }  catch (requestError) {
      console.error(
        "adminApproveStoreApplication request failed",
        requestError,
      );

      setCreatedStoreError(
        "Serverlə əlaqə qurulmadı. Səhifəni yeniləyib yenidən cəhd edin.",
      );
    } finally {
      setCreatingStoreId((current) =>
        current === conversationId
          ? null
          : current,
      );
    }
  };

  const updateNewStoreField = <
    K extends keyof NewStoreRequestFields,
  >(
    key: K,
    value: NewStoreRequestFields[K],
  ) => {
    setNewStoreForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const handleCancelNewStore = () => {
    setSelectedId(null);
    setNewStoreForm(null);
    setApplicationLoadError(null);
    setApplicationRawMessage("");
    setCreatedStoreError(null);
  };

  const handleCopyStoreCode = async () => {
    if (!createdStore) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdStore.storeCode,
      );
    } catch {
      // Clipboard icazəsi verilmədi.
    }
  };

  const handleCopyClaimCode = async () => {
    if (!createdStore?.claimCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdStore.claimCode,
      );
    } catch {
      // Clipboard icazəsi verilmədi.
    }
  };

  const handleGenerateClaimCode =
    async () => {
      if (
        !selectedId ||
        !createdStore ||
        creatingStore ||
        generatingClaimCode
      ) {
        return;
      }

      const conversationId = selectedId;

      setGeneratingClaimCodeId(
        conversationId,
      );

      setCreatedStoreError(null);

      try {
        const result =
          await adminGenerateClaimCode(
            createdStore.storeId,
            14,
          );

        if (!result.ok) {
          setCreatedStoreError(
            result.error,
          );
          return;
        }

        setCreatedStoresByConversation(
          (current) => {
            const existing =
              current[conversationId];

            if (!existing) {
              return current;
            }

            return {
              ...current,
              [conversationId]: {
                ...existing,
                claimCode:
                  result.claimCode,
                claimCodeExpiresAt:
                  result.expiresAt,
              },
            };
          },
        );
      } finally {
        setGeneratingClaimCodeId(
          (current) =>
            current === conversationId
              ? null
              : current,
        );
      }
    };

  const handleTabChange = (
    tab: SupportTab,
  ) => {
    setActiveTab(tab);
    setSelectedId(null);
    setNewStoreForm(null);
    setApplicationLoadError(null);
    setApplicationRawMessage("");
    setCreatedStoreError(null);

    if (tab === "store_applications") {
      setTypeFilter("all");
    }
  };

  const statusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(
        allRows.map(
          (row) => row.displayStatus,
        ),
      ),
    );

    return [
      {
        value: "all",
        label: "Bütün statuslar",
      },
      ...statuses.map((status) => ({
        value: status,
        label:
          STATUS_LABELS[status] ??
          status,
      })),
    ];
  }, [allRows]);

  const typeOptions = [
    {
      value: "all",
      label: "Bütün tiplər",
    },
    {
      value: "store_support",
      label: "Mağaza dəstəyi",
    },
    {
      value: "customer_support",
      label: "Customer dəstəyi",
    },
    {
      value: "customer_store",
      label: "Customer-mağaza",
    },
  ];

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CountCard
          label="Mağaza müraciətləri"
          count={storeApplications.length}
        />

        <CountCard
          label="Mağaza dəstəyi"
          count={store.length}
        />

        <CountCard
          label="Customer dəstəyi"
          count={customer.length}
        />

        <CountCard
          label="Report/escalation"
          count={customerStoreQueue.length}
        />
      </section>

      <div className="flex flex-wrap gap-2 rounded-xl border border-brand-border/80 bg-white p-2">
        <button
          type="button"
          onClick={() =>
            handleTabChange("support")
          }
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "support"
              ? "bg-brand-primary text-white"
              : "text-brand-text hover:bg-brand-surface"
          }`}
        >
          Dəstək mesajları
        </button>

        <button
          type="button"
          onClick={() =>
            handleTabChange(
              "store_applications",
            )
          }
          className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            activeTab ===
            "store_applications"
              ? "bg-brand-primary text-white"
              : "text-brand-text hover:bg-brand-surface"
          }`}
        >
          Mağaza müraciətləri (
          {storeApplications.length})
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-brand-border/80 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Axtar..."
            className="w-full rounded-lg border border-brand-border bg-brand-surface py-2 pl-8 pr-3 text-sm text-brand-text outline-none focus:border-brand-primary/50"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value,
            )
          }
          className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
        >
          {statusOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        {activeTab === "support" ? (
          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value,
              )
            }
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
          >
            {typeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <section className="max-h-[calc(100vh-340px)] overflow-y-auto rounded-xl border border-brand-border/80 bg-white p-3">
          {filteredRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-muted">
              Söhbət tapılmadı.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredRows.map((row) => {
                const isSelected =
                  selectedId === row.id;

                const needsAudit =
                  row.rowType ===
                    "customer_store" ||
                  row.rowType ===
                    "store_support";

                const isAudited =
                  auditedId === row.id;

                return (
                  <li
                    key={row.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      isSelected
                        ? "border-brand-primary bg-brand-primary-light/40"
                        : "border-brand-border hover:border-brand-primary/40 hover:bg-brand-surface"
                    }`}
                    onClick={() =>
                      setSelectedId(row.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-brand-text">
                          {row.title}
                        </p>

                        <p
                          className="truncate text-xs text-brand-muted"
                          title={row.subtitle}
                        >
                          {row.subtitle}
                        </p>
                      </div>

                      {row.reportCount > 0 ? (
                        <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                          {row.reportCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={
                          row.displayStatus
                        }
                      />

                      <TypeBadge
                        type={
                          row.displayType
                        }
                      />
                    </div>

                    <p className="mt-2 text-[11px] text-brand-muted">
                      Son aktivlik:{" "}
                      {formatLastActivity(
                        row.last_message_at ??
                          row.updated_at,
                      )}
                    </p>

                    {needsAudit &&
                    !isAudited ? (
                      <p className="mt-1 text-[11px] font-semibold text-amber-600">
                        Audit tələb olunur
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-brand-border/80 bg-white p-4">
          {!selectedRow ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-brand-text">
                Söhbət seçilməyib
              </p>

              <p className="mt-1 text-xs text-brand-muted">
                Sol tərəfdən söhbət seçin və
                ya axtarın.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-border pb-3">
                <div>
                  <h2 className="text-lg font-bold text-brand-text">
                    {selectedRow.title}
                  </h2>

                  <p className="text-sm text-brand-muted">
                    {selectedRow.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    status={
                      selectedRow.displayStatus
                    }
                  />

                  <TypeBadge
                    type={
                      selectedRow.displayType
                    }
                  />
                </div>
              </div>

              {isNewStoreRequest ? (
                applicationLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm font-semibold text-brand-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                    Müraciət yüklənir...
                  </div>
                ) : applicationLoadError ? (
                  <div className="space-y-3">
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                      {applicationLoadError}
                    </p>

                    {applicationRawMessage ? (
                      <div className="rounded-lg border border-brand-border/80 bg-brand-surface/40 p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-muted">
                          Orijinal mesaj
                        </p>

                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-brand-text">
                          {
                            applicationRawMessage
                          }
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : newStoreForm ? (
                  <div className="space-y-3">
                    {createdStoreError ? (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                        {createdStoreError}
                      </p>
                    ) : null}

                    {createdStore ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                        <p className="font-bold">
                          Mağaza yaradıldı:{" "}
                          {createdStore.name}
                        </p>

                        <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                          <p className="text-xs font-bold text-emerald-700">
                            Daimi mağaza kodu
                          </p>

                          <p className="mt-1 font-mono text-base font-black">
                            {
                              createdStore.storeCode
                            }
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyStoreCode()
                            }
                            className="mt-2 inline-flex items-center rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            Mağaza kodunu
                            kopyala
                          </button>
                        </div>

                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                          <p className="text-xs font-bold text-amber-800">
                            Məxfi sahiblik
                            təsdiq kodu
                          </p>

                          {createdStore.claimCode ? (
                            <>
                              <p className="mt-1 font-mono text-lg font-black tracking-wide">
                                {
                                  createdStore.claimCode
                                }
                              </p>

                              {createdStore.claimCodeExpiresAt ? (
                                <p className="mt-1 text-xs">
                                  Etibarlıdır:{" "}
                                  {formatLastActivity(
                                    createdStore.claimCodeExpiresAt,
                                  )}
                                </p>
                              ) : null}

                              <p className="mt-2 text-xs font-semibold">
                                Məxfi kod yalnız
                                yaradıldığı anda
                                açıq göstərilir.
                                Təhlükəsiz yerdə
                                saxlayın.
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopyClaimCode()
                                }
                                className="mt-2 inline-flex items-center rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100"
                              >
                                Məxfi kodu
                                kopyala
                              </button>
                            </>
                          ) : (
                            <p className="mt-2 text-xs font-semibold">
                              Plain məxfi kod
                              saxlanılmır. Bu
                              mağaza üçün yeni
                              məxfi kod yaradın.
                            </p>
                          )}

                          <button
                            type="button"
                            disabled={
                              generatingClaimCode
                            }
                            onClick={() =>
                              void handleGenerateClaimCode()
                            }
                            className="ml-2 mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generatingClaimCode ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}

                            {createdStore.claimCode
                              ? "Məxfi kodu yenilə"
                              : "Məxfi kod yarat"}
                          </button>
                        </div>

                        <p className="mt-3 text-xs font-semibold">
                          Mağaza kodu dəyişmir.
                          Yeni məxfi kod
                          yaradıldıqda köhnə
                          məxfi kod etibarsız
                          olur.
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-brand-border/80 bg-brand-surface/40 p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-muted">
                        Orijinal müraciət
                      </p>

                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-brand-text">
                        {newStoreForm.raw}
                      </pre>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Mağaza adı *
                        </span>

                        <input
                          value={
                            newStoreForm.name
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "name",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Kateqoriya
                        </span>

                        <input
                          value={
                            newStoreForm.category
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "category",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Şəhər
                        </span>

                        <input
                          value={
                            newStoreForm.city
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "city",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Təsvir
                        </span>

                        <textarea
                          value={
                            newStoreForm.description
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "description",
                              event.target
                                .value,
                            )
                          }
                          rows={3}
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Ünvan
                        </span>

                        <input
                          value={
                            newStoreForm.address
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "address",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          İş günləri
                        </span>

                        <input
                          value={
                            newStoreForm.weekdays
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "weekdays",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Açılış saatı
                        </span>

                        <input
                          type="time"
                          value={
                            newStoreForm.openingTime
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "openingTime",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Bağlanış saatı
                        </span>

                        <input
                          type="time"
                          value={
                            newStoreForm.closingTime
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "closingTime",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          Telefon
                        </span>

                        <input
                          value={
                            newStoreForm.phone
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "phone",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          WhatsApp
                        </span>

                        <input
                          value={
                            newStoreForm.whatsapp
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "whatsapp",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-brand-muted">
                          E-poçt
                        </span>

                        <input
                          type="email"
                          value={
                            newStoreForm.email
                          }
                          onChange={(event) =>
                            updateNewStoreField(
                              "email",
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/50"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleApproveNewStore()
                        }
                        disabled={
                          creatingStore ||
                          Boolean(
                            createdStore,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-60"
                      >
                        {creatingStore ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}

                        Təsdiq et və kod
                        yarat
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleCancelNewStore
                        }
                        disabled={
                          creatingStore
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-bold text-brand-text transition-colors hover:bg-brand-surface disabled:opacity-60"
                      >
                        Ləğv et
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Müraciət məlumatları
                    tapılmadı.
                  </p>
                )
              ) : (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {selectedRow.rowType !==
                  "customer_store" ? (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold text-brand-muted">
                        Son mesaj
                      </p>

                      <p className="whitespace-pre-wrap text-brand-text">
                        {(selectedRow as (typeof items)[number])
                          .last_message_body ??
                          "—"}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-semibold text-brand-muted">
                      Mövzu
                    </p>

                    <p className="text-brand-text">
                      {("support_topic" in
                        selectedRow &&
                        selectedRow.support_topic &&
                        TOPIC_LABELS[
                          selectedRow
                            .support_topic
                        ]) ??
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-brand-muted">
                      Son aktivlik
                    </p>

                    <p className="text-brand-text">
                      {formatLastActivity(
                        selectedRow.last_message_at ??
                          selectedRow.updated_at,
                      )}
                    </p>
                  </div>

                  {"report_count" in
                  selectedRow ? (
                    <div>
                      <p className="text-xs font-semibold text-brand-muted">
                        Report sayı
                      </p>

                      <p className="text-brand-text">
                        {
                          selectedRow.report_count
                        }
                      </p>
                    </div>
                  ) : null}

                  {"assigned_admin_id" in
                    selectedRow &&
                  selectedRow.assigned_admin_id ? (
                    <div>
                      <p className="text-xs font-semibold text-brand-muted">
                        Təyin edilmiş admin
                      </p>

                      <p className="text-brand-text">
                        {
                          selectedRow.assigned_admin_id
                        }
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {auditedId === selectedRow.id ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  Audit qeydə alındı.
                  Söhbətə baxmaq olar.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedRow.rowType ===
                  "customer_store" &&
                auditedId !== selectedRow.id ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleAuditOpen(
                        selectedRow as AdminCustomerStoreConversationSummary,
                      )
                    }
                    disabled={
                      auditingId ===
                      selectedRow.id
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-primary transition-colors hover:border-brand-primary/40 disabled:opacity-60"
                  >
                    {auditingId ===
                    selectedRow.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}

                    Audit et və aç
                  </button>
                ) : null}

                {selectedRow.rowType ===
                  "store_support" &&
                auditedId !== selectedRow.id ? (
                  <button
                    type="button"
                    onClick={() =>
                      void handleStoreSupportAuditOpen(
                        selectedRow as AdminSupportConversationSummary,
                      )
                    }
                    disabled={
                      auditingId ===
                      selectedRow.id
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-bold text-brand-primary transition-colors hover:border-brand-primary/40 disabled:opacity-60"
                  >
                    {auditingId ===
                    selectedRow.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}

                    Audit et və aç
                  </button>
                ) : null}

                {auditedId ===
                selectedRow.id ? (
                  <Link
                    href={`/account/messages/${selectedRow.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-primary-dark"
                  >
                    Söhbəti aç
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
