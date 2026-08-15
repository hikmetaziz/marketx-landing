export const STORE_OWNER_MESSAGE =
  "Salam. MarktX-də mağazanız üçün məhsul səhifəsi hazırlanıb. İstəsəniz, mağaza səhifəsini öz hesabınıza bağlayıb elanları özünüz idarə edə bilərsiniz. Bunun üçün MarktX-də qeydiyyatdan keçin və sizə verilən mağaza kodu ilə müraciət göndərin. Müraciət admin tərəfindən yoxlandıqdan sonra mağaza hesabınıza bağlanacaq.";

export function buildStoreOwnerMessage(storeCode: string): string {
  return `${STORE_OWNER_MESSAGE}\n\nMağaza kodu: ${storeCode}`;
}

export const STORE_STATUS_LABELS: Record<string, string> = {
  unclaimed: "Sahibsiz",
  claim_pending: "Gözləyən",
  claimed: "Sahiblənmiş",
  suspended: "Dayandırılmış",
};

export const CLAIM_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Müraciətiniz yoxlamadadır.",
  approved: "Mağaza hesabınıza bağlandı.",
  rejected: "Müraciət rədd edildi.",
  cancelled: "Müraciət ləğv edildi.",
  expired: "Müraciətin vaxtı bitdi.",
};

export const CLAIM_REQUEST_STATUS_SHORT: Record<string, string> = {
  pending: "Gözləyir",
  approved: "Təsdiqləndi",
  rejected: "Rədd edildi",
  cancelled: "Ləğv edildi",
  expired: "Vaxtı bitdi",
};
