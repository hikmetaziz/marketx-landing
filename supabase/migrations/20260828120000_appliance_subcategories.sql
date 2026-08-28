-- Add canonical appliance subcategories without changing existing listings.

do $$
declare
  appliance_category_count integer;
  appliance_category_id uuid;
begin
  select count(*)
  into appliance_category_count
  from public.categories
  where slug = 'meiset-texnikasi';

  if appliance_category_count <> 1 then
    raise exception
      'Expected exactly one meiset-texnikasi category, found %',
      appliance_category_count;
  end if;

  select id
  into appliance_category_id
  from public.categories
  where slug = 'meiset-texnikasi';

  insert into public.subcategories (category_id, slug, name, sort_order, is_active)
  select appliance_category_id, seed.slug, seed.name, seed.sort_order, true
  from (
    values
      ('soyuducular', 'Soyuducular', 10),
      ('paltaryuyanlar', 'Paltaryuyanlar', 20),
      ('kondisionerler', 'Kondisionerlər', 30),
      ('qabyuyanlar', 'Qabyuyanlar', 40),
      ('tozsoranlar', 'Tozsoranlar', 50),
      ('bisirme-texnikasi', 'Bişirmə texnikası', 60),
      ('kicik-meiset-texnikasi', 'Kiçik məişət texnikası', 70),
      ('diger-meiset-texnikasi', 'Digər məişət texnikası', 80)
  ) as seed(slug, name, sort_order)
  on conflict (category_id, slug) do update
  set
    name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true;
end;
$$;
