import type { ListingStatus } from "@/types/live-listing";

export const LISTING_ACTIVE_DAYS = 30;
export const LISTING_RENEW_WINDOW_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export type ListingExpiryUi = {
  daysLeft: number | null;
  label: string | null;
  canRenew: boolean;
  isUrgent: boolean;
};

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / MS_PER_DAY);
}

export function getListingExpiryUi(
  expiresAt: string | null,
  status: ListingStatus,
): ListingExpiryUi {
  if (!expiresAt || status === "pending" || status === "rejected" || status === "sold") {
    return { daysLeft: null, label: null, canRenew: false, isUrgent: false };
  }

  const daysLeft = daysUntil(expiresAt);

  if (status === "active") {
    if (daysLeft <= 0) {
      return {
        daysLeft,
        label: "Elanın 30 günlük müddəti bitib — yeniləyin",
        canRenew: true,
        isUrgent: true,
      };
    }

    if (daysLeft <= LISTING_RENEW_WINDOW_DAYS) {
      return {
        daysLeft,
        label: `${daysLeft} gün sonra deaktiv olacaq`,
        canRenew: true,
        isUrgent: true,
      };
    }

    return {
      daysLeft,
      label: `${daysLeft} gün aktiv qalacaq`,
      canRenew: false,
      isUrgent: false,
    };
  }

  if (status === "archived" && daysLeft <= 0) {
    return {
      daysLeft,
      label: "Elanın müddəti bitib — yeniləyin və ya yenidən yerləşdirin",
      canRenew: true,
      isUrgent: true,
    };
  }

  return { daysLeft: null, label: null, canRenew: false, isUrgent: false };
}
