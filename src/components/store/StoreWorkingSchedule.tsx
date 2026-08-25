import { ChevronDown, Clock } from "lucide-react";

import type { PublicStoreSchedule } from "@/lib/stores/stores";

const DAY_LABELS: Record<string, string> = {
  monday: "Bazar ertəsi",
  tuesday: "Çərşənbə axşamı",
  wednesday: "Çərşənbə",
  thursday: "Cümə axşamı",
  friday: "Cümə",
  saturday: "Şənbə",
  sunday: "Bazar",
};

const DAY_KEYS = Object.keys(DAY_LABELS);

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function parseMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = normalizeTime(value).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function normalizedWorkingDays(value: string): string[] {
  const entries = value.split(",").map((day) => day.trim().toLocaleLowerCase("az-AZ"));

  return DAY_KEYS.filter((key) => {
    const label = DAY_LABELS[key].toLocaleLowerCase("az-AZ");
    return entries.includes(key) || entries.includes(label);
  });
}

function currentBakuTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baku",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    day: part("weekday").toLowerCase(),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

export function StoreWorkingSchedule({ schedule }: { schedule: PublicStoreSchedule }) {
  const workingDays = normalizedWorkingDays(schedule.working_days);
  const openingTime = normalizeTime(schedule.opening_time);
  const closingTime = normalizeTime(schedule.closing_time);
  const now = currentBakuTime();
  const openingMinutes = parseMinutes(openingTime);
  const closingMinutes = parseMinutes(closingTime);
  const isWorkingDay = workingDays.includes(now.day);
  const isOpen =
    isWorkingDay &&
    (closingMinutes > openingMinutes
      ? now.minutes >= openingMinutes && now.minutes < closingMinutes
      : now.minutes >= openingMinutes || now.minutes < closingMinutes);
  const statusDetail = isOpen
    ? `${closingTime}-dək`
    : isWorkingDay && now.minutes < openingMinutes
      ? `${openingTime}-da açılır`
      : null;

  return (
    <details className="group w-fit max-w-full text-sm">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 text-brand-text marker:hidden hover:border-brand-primary/30">
        <Clock className="h-4 w-4 shrink-0" aria-hidden />
        <span className={isOpen ? "font-semibold text-emerald-600" : "font-semibold text-brand-muted"}>
          {isOpen ? "Açıqdır" : "Bağlıdır"}
        </span>
        {statusDetail ? <span className="truncate text-brand-muted">{statusDetail}</span> : null}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="mt-2 max-w-sm rounded-lg border border-brand-border bg-brand-surface/60 p-3 text-brand-text">
        <p className="font-semibold">İş qrafiki</p>
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs leading-5">
          <dt className="text-brand-muted">İş günləri</dt>
          <dd>{workingDays.map((day) => DAY_LABELS[day]).join(", ")}</dd>
          <dt className="text-brand-muted">İş saatları</dt>
          <dd>{openingTime}–{closingTime}</dd>
        </dl>
      </div>
    </details>
  );
}
