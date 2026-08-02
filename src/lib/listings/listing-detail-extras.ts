import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CategorySchemaSnapshot } from "@/lib/category-schema/schema-contract";
import { getAttributeDefinitions } from "@/lib/taxonomy/listing-taxonomy-utils";
import type {
  ListingAttributeValues,
  ListingTaxonomy,
  TaxonomyAttributeDefinition,
} from "@/lib/taxonomy/listing-taxonomy-types";

export type ListingDetailStats = {
  views: number;
  favorites: number;
};

function formatAttributeDisplayValue(
  definition: TaxonomyAttributeDefinition,
  raw: ListingAttributeValues[string],
): string | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  if (definition.type === "boolean") {
    return raw === true ? "Bəli" : raw === false ? "Xeyr" : null;
  }

  if (definition.type === "multi_select" && Array.isArray(raw)) {
    const values = raw.filter((item) => typeof item === "string" && item.trim());
    return values.length > 0 ? values.join(", ") : null;
  }

  if (typeof raw === "number") {
    return String(raw);
  }

  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  return null;
}

export function buildListingAttributeRows(
  taxonomy: ListingTaxonomy,
  categoryId: string | null,
  subcategoryId: string | null,
  attributes: ListingAttributeValues,
  schemaSnapshot?: CategorySchemaSnapshot | null,
): Array<{ label: string; value: string }> {
  const definitions = getAttributeDefinitions(taxonomy, categoryId, subcategoryId, schemaSnapshot);

  return definitions.reduce<Array<{ label: string; value: string }>>((rows, definition) => {
    const value = formatAttributeDisplayValue(definition, attributes[definition.key]);
    if (value) {
      rows.push({ label: definition.label_az, value });
    }
    return rows;
  }, []);
}

export async function fetchListingFavoriteCount(listingId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("favorites")
      .select("listing_id", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if (error) {
      return 0;
    }

    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchSellerLabel(userId: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    return "Satıcı";
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, full_name, name")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return "Satıcı";
    }

    const row = data as Record<string, unknown>;
    for (const key of ["display_name", "full_name", "name"]) {
      const value = row[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  } catch {
    return "Satıcı";
  }

  return "Satıcı";
}
