-- Seed all auto listings, including pending imports that may become active later.

alter table public.listings disable trigger listings_before_update;

with auto_listings as (
  select
    l.id,
    row_number() over (
      order by
        coalesce(l.price, 999999999) asc,
        l.created_at desc,
        l.id asc
    ) as deal_rank,
    count(*) over () as total_count
  from public.listings l
  left join public.categories c on c.id = l.category_id
  where l.source = 'turbo_nbk_motors'
    or lower(coalesce(l.category, '')) in ('avto', 'avtomobil', 'neqliyyat', 'nəqliyyat')
    or c.slug in ('avto', 'neqliyyat')
)
update public.listings l
set view_seed =
  case
    when a.total_count <= 1 then 55000
    else 50000 + round(
      ((a.total_count - a.deal_rank)::numeric / greatest(a.total_count - 1, 1)) * 5000
    )::integer
  end
from auto_listings a
where a.id = l.id;

alter table public.listings enable trigger listings_before_update;
