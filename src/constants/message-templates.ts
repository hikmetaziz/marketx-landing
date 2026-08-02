export type MessageTemplate = {
  id: string;
  label: string;
  text: string;
};

export type MessageTemplateAudience = "customer" | "store" | "support";

export const CUSTOMER_MESSAGE_TEMPLATES = [
  { id: "available", label: "Hələ satışdadır?", text: "Salam, elan hələ aktualdır?" },
  { id: "last-price", label: "Son qiymət?", text: "Son qiymət nə qədər ola bilər?" },
  { id: "viewing-place", label: "Harada baxa bilərəm?", text: "Harada görüşüb baxa bilərəm?" },
  { id: "delivery", label: "Çatdırılma var?", text: "Çatdırılma var?" },
  { id: "photos", label: "Daha çox foto", text: "Başqa rakurs və ya foto var?" },
  { id: "barter", label: "Barter mümkündür?", text: "Barter mümkündür?" },
] as const satisfies readonly MessageTemplate[];

export const STORE_MESSAGE_TEMPLATES = [
  { id: "in-stock", label: "Mövcuddur", text: "Bəli, məhsul mövcuddur." },
  {
    id: "store-viewing",
    label: "Mağazada baxış",
    text: "Mağazada baxa bilərsiniz. Uyğun vaxtı yazın, dəqiqləşdirək.",
  },
  {
    id: "delivery-check",
    label: "Çatdırılma",
    text: "Çatdırılma mümkündür. Ünvanı yazın, şərtləri dəqiqləşdirək.",
  },
  { id: "payment-options", label: "Ödəniş", text: "Nağd və ya kartla ödəniş mümkündür." },
  {
    id: "warranty-set",
    label: "Zəmanət/komplekt",
    text: "Zəmanət və komplekt barədə məlumatı dəqiqləşdirib yazıram.",
  },
  { id: "extra-media", label: "Foto/video", text: "Əlavə foto və ya video göndərə bilərəm." },
  { id: "discount-possible", label: "Endirim", text: "Qiymətdə kiçik endirim mümkündür." },
  { id: "reserve-time", label: "Rezerv/vaxt", text: "İstəsəniz uyğun baxış və götürmə vaxtını dəqiqləşdirək." },
] as const satisfies readonly MessageTemplate[];

export const SUPPORT_MESSAGE_TEMPLATES = [
  { id: "reviewing", label: "Baxırıq", text: "Müraciətinizə baxırıq." },
  { id: "need-details", label: "Detalları göndərin", text: "Zəhmət olmasa əlavə məlumat göndərin." },
  { id: "checking", label: "Yoxlayırıq", text: "Bu məsələni yoxlayıb sizə yazacağıq." },
  { id: "resolved-follow-up", label: "Xəbər verəcəyik", text: "Məsələ həll edilən kimi sizə xəbər verəcəyik." },
] as const satisfies readonly MessageTemplate[];

export const MESSAGE_TEMPLATES_BY_AUDIENCE: Record<MessageTemplateAudience, readonly MessageTemplate[]> = {
  customer: CUSTOMER_MESSAGE_TEMPLATES,
  store: STORE_MESSAGE_TEMPLATES,
  support: SUPPORT_MESSAGE_TEMPLATES,
};

export const MESSAGE_TEMPLATES = CUSTOMER_MESSAGE_TEMPLATES;
