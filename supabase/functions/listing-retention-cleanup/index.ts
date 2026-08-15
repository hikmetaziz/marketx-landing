import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

type CleanupRequest = {
  dryRun?: boolean;
  limit?: number;
};

type DeletedListing = {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  image_urls: string[] | null;
  purge_after: string;
};

type Failure = {
  listing_id?: string;
  title?: string;
  stage: string;
  error: string;
};

const BUCKET = "listing-images";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return ["1", "true", "yes", "dry-run"].includes(value.toLowerCase());
}

async function readRequest(request: Request): Promise<CleanupRequest> {
  const url = new URL(request.url);
  const fromQuery = parseBoolean(url.searchParams.get("dryRun") ?? url.searchParams.get("dry_run"));

  let body: CleanupRequest = {};
  if (request.method !== "GET") {
    try {
      body = (await request.json()) as CleanupRequest;
    } catch {
      body = {};
    }
  }

  return {
    ...body,
    dryRun: fromQuery ?? body.dryRun ?? true,
  };
}

function storagePathFromUrl(raw: string | null | undefined, supabaseUrl: string): string | null {
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const project = new URL(supabaseUrl);
    if (parsed.origin !== project.origin) return null;

    const markerPublic = `/storage/v1/object/public/${BUCKET}/`;
    const markerSigned = `/storage/v1/object/sign/${BUCKET}/`;
    const marker = parsed.pathname.includes(markerPublic) ? markerPublic : markerSigned;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;

    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

async function listFolderPaths(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  listingId: string,
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId, {
    limit: 100,
  });

  if (error || !data) return [];

  return data
    .filter((file) => file.name.startsWith(listingId))
    .map((file) => `${userId}/${file.name}`);
}

async function collectStoragePaths(
  supabase: ReturnType<typeof createClient>,
  listing: DeletedListing,
  supabaseUrl: string,
): Promise<string[]> {
  const paths: string[] = [];

  const fromPrimary = storagePathFromUrl(listing.image_url, supabaseUrl);
  if (fromPrimary) paths.push(fromPrimary);

  for (const url of listing.image_urls ?? []) {
    const path = storagePathFromUrl(url, supabaseUrl);
    if (path) paths.push(path);
  }

  const { data: rows } = await supabase.rpc("listing_storage_paths_for_listing", {
    p_listing_id: listing.id,
  });

  for (const row of (rows ?? []) as Array<{ storage_path: string | null }>) {
    if (row.storage_path) paths.push(row.storage_path);
  }

  paths.push(...(await listFolderPaths(supabase, listing.user_id, listing.id)));

  return unique(paths).sort();
}

async function isSharedStoragePath(
  supabase: ReturnType<typeof createClient>,
  path: string,
  listingId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("listing_storage_path_reference_count", {
    p_storage_path: path,
    p_excluding_listing_id: listingId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0) > 0;
}

async function deleteListingRecord(
  supabase: ReturnType<typeof createClient>,
  listingId: string,
): Promise<void> {
  const reports = await supabase
    .from("reports")
    .delete()
    .eq("target_type", "listing")
    .eq("listing_id", listingId);

  if (reports.error) {
    throw new Error(`reports: ${reports.error.message}`);
  }

  const deleted = await supabase.from("listings").delete().eq("id", listingId).eq("status", "deleted");
  if (deleted.error) {
    throw new Error(`listings: ${deleted.error.message}`);
  }
}

serve(() =>
  jsonResponse(
    {
      ok: false,
      disabled: true,
      message: "Listing hard-delete cleanup is disabled. Deleted listings are kept as database history.",
    },
    410,
  )
);

async function disabledCleanupImplementation(request: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cleanupSecret = Deno.env.get("LISTING_CLEANUP_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing Supabase server configuration." }, 500);
  }

  if (!cleanupSecret) {
    return jsonResponse({ ok: false, error: "LISTING_CLEANUP_SECRET is not configured." }, 500);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-cleanup-secret") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (bearer !== cleanupSecret && headerSecret !== cleanupSecret) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
  }

  const input = await readRequest(request);
  const dryRun = input.dryRun !== false;
  const limit = Math.min(Math.max(Number(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const logInsert = await supabase
    .from("listing_cleanup_runs")
    .insert({
      started_at: startedAt,
      status: "running",
    })
    .select("id")
    .single();

  const logId = (logInsert.data as { id?: string } | null)?.id ?? null;

  const failures: Failure[] = [];
  let listingsDeleted = 0;
  let imagesDeleted = 0;

  const { data: listings, error: listError } = await supabase
    .from("listings")
    .select("id, user_id, title, image_url, image_urls, purge_after")
    .eq("status", "deleted")
    .not("purge_after", "is", null)
    .lte("purge_after", new Date().toISOString())
    .order("purge_after", { ascending: true })
    .limit(limit);

  if (listError) {
    if (logId) {
      await supabase
        .from("listing_cleanup_runs")
        .update({
          completed_at: new Date().toISOString(),
          failures: 1,
          error_details: [{ stage: "select", error: listError.message }],
          status: "failed",
        })
        .eq("id", logId);
    }

    return jsonResponse({ ok: false, error: listError.message }, 500);
  }

  const expiredListings = (listings ?? []) as DeletedListing[];
  const dryRunListings: Array<{
    id: string;
    title: string;
    purge_after: string;
    storage_paths: string[];
    shared_paths: string[];
    deletable_paths: string[];
  }> = [];

  for (const listing of expiredListings) {
    try {
      const paths = await collectStoragePaths(supabase, listing, supabaseUrl);
      const sharedPaths: string[] = [];
      const deletablePaths: string[] = [];

      for (const path of paths) {
        if (await isSharedStoragePath(supabase, path, listing.id)) {
          sharedPaths.push(path);
        } else {
          deletablePaths.push(path);
        }
      }

      if (dryRun) {
        dryRunListings.push({
          id: listing.id,
          title: listing.title,
          purge_after: listing.purge_after,
          storage_paths: paths,
          shared_paths: sharedPaths,
          deletable_paths: deletablePaths,
        });
        continue;
      }

      if (deletablePaths.length > 0) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(deletablePaths);
        if (removeError) {
          throw new Error(`storage: ${removeError.message}`);
        }
        imagesDeleted += deletablePaths.length;
      }

      await deleteListingRecord(supabase, listing.id);
      listingsDeleted += 1;
    } catch (error) {
      failures.push({
        listing_id: listing.id,
        title: listing.title,
        stage: "listing",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const completedAt = new Date().toISOString();
  const finalStatus = dryRun
    ? "dry_run"
    : failures.length > 0
      ? listingsDeleted > 0
        ? "partial_failed"
        : "failed"
      : "completed";

  if (logId) {
    await supabase
      .from("listing_cleanup_runs")
      .update({
        completed_at: completedAt,
        listings_found: expiredListings.length,
        listings_deleted: listingsDeleted,
        images_deleted: imagesDeleted,
        failures: failures.length,
        error_details: failures,
        status: finalStatus,
      })
      .eq("id", logId);
  }

  return jsonResponse({
    ok: failures.length === 0,
    dryRun,
    limit,
    listingsFound: expiredListings.length,
    listingsDeleted,
    imagesDeleted,
    failures,
    wouldDelete: dryRun ? dryRunListings : undefined,
    logId,
  });
}
