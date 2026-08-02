-- MarktX: read-only verification of the live Ecosoft listing state.
-- Run in the Supabase SQL editor to confirm the counts and per-listing image/status
-- against exports/ecosoft-image-repair/backup-manifest.json. Read-only (no writes).

select jsonb_pretty(jsonb_build_object(
  'by_status', (
    select jsonb_object_agg(status, total order by status)
    from (
      select status, count(*) total
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
      group by status
    ) t
  ),
  'ai_generated_images', (
    select count(*) from public.listings
    where source = 'ecosoft_price_list'
      and attributes ->> 'image_source' = 'ai_generated'
  ),
  'svg_images', (
    select count(*) from public.listings
    where source = 'ecosoft_price_list'
      and coalesce(image_url,'') ilike '%.svg'
  ),
  'rows', (
    select jsonb_agg(to_jsonb(r) order by (r).status, (r).sku)
    from (
      select
        attributes ->> 'sku' as sku,
        status,
        attributes ->> 'image_source' as image_source,
        rejected_reason,
        image_url
      from public.listings
      where source = 'ecosoft_price_list'
        and store_id = '42683efe-0872-4d2a-9849-a4dc0def59e4'
    ) r
  )
)) as result;
