import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

const BUCKET = "listing-images";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_ATTEMPTS = 5;

type QueueRow = {
  id: string;
  object_paths: string[];
  listing_id: string | null;
  attempts: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cleanupSecret = Deno.env.get("STORAGE_CLEANUP_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !cleanupSecret) {
    return jsonResponse(
      { ok: false, error: "Missing server configuration." },
      500,
    );
  }

  const suppliedSecret = request.headers.get("x-cleanup-secret") ?? "";

  if (suppliedSecret !== cleanupSecret) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
  }

  let limit = DEFAULT_LIMIT;

  try {
    const body = await request.json();
    const requestedLimit = Number(body?.limit);

    if (Number.isFinite(requestedLimit)) {
      limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    }
  } catch {
    // Empty body is allowed.
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("storage_cleanup_queue")
    .select("id, object_paths, listing_id, attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
  }

  const rows = (data ?? []) as QueueRow[];

  let completed = 0;
  let failed = 0;
  let imagesDeleted = 0;

  const failures: Array<{
    queue_id: string;
    error: string;
  }> = [];

  for (const row of rows) {
    try {
      const safePaths: string[] = [];

      for (const path of [...new Set(row.object_paths ?? [])]) {
        if (!path || !row.listing_id) {
          continue;
        }

        const { data: referenceCount, error: referenceError } =
          await supabase.rpc("listing_storage_path_reference_count", {
            p_storage_path: path,
            p_excluding_listing_id: row.listing_id,
          });

        if (referenceError) {
          throw new Error(
            `reference check failed for ${path}: ${referenceError.message}`,
          );
        }

        if (Number(referenceCount ?? 0) === 0) {
          safePaths.push(path);
        }
      }

      if (safePaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(safePaths);

        if (removeError) {
          throw new Error(`storage remove failed: ${removeError.message}`);
        }

        imagesDeleted += safePaths.length;
      }

      const { error: updateError } = await supabase
        .from("storage_cleanup_queue")
        .update({
          status: "done",
          attempts: row.attempts + 1,
          last_error: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "pending");

      if (updateError) {
        throw new Error(`queue update failed: ${updateError.message}`);
      }

      completed += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const nextAttempts = row.attempts + 1;
      const nextStatus =
        nextAttempts >= MAX_ATTEMPTS ? "failed" : "pending";

      await supabase
        .from("storage_cleanup_queue")
        .update({
          status: nextStatus,
          attempts: nextAttempts,
          last_error: message.slice(0, 2000),
          processed_at:
            nextStatus === "failed"
              ? new Date().toISOString()
              : null,
        })
        .eq("id", row.id);

      failed += 1;

      failures.push({
        queue_id: row.id,
        error: message,
      });
    }
  }

  return jsonResponse({
    ok: failed === 0,
    rowsFound: rows.length,
    completed,
    failed,
    imagesDeleted,
    failures,
  });
});