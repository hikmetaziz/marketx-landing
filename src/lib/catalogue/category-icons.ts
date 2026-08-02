import {
  Armchair,
  Baby,
  Briefcase,
  Building2,
  Car,
  ClipboardList,
  GraduationCap,
  Grid2x2,
  Hammer,
  House,
  Monitor,
  PawPrint,
  Shirt,
  Smartphone,
  Store,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

import type { CategoryCatalogueIconKey } from "@/constants/category-catalogue";

export const CATEGORY_CATALOGUE_ICON_MAP: Record<CategoryCatalogueIconKey, LucideIcon> = {
  building: Building2,
  car: Car,
  phone: Smartphone,
  monitor: Monitor,
  washing: WashingMachine,
  house: House,
  armchair: Armchair,
  shirt: Shirt,
  briefcase: Briefcase,
  clipboard: ClipboardList,
  baby: Baby,
  paw: PawPrint,
  store: Store,
  hammer: Hammer,
  graduation: GraduationCap,
  grid: Grid2x2,
};

export function getCategoryCatalogueIcon(icon: CategoryCatalogueIconKey): LucideIcon {
  return CATEGORY_CATALOGUE_ICON_MAP[icon] ?? Grid2x2;
}
