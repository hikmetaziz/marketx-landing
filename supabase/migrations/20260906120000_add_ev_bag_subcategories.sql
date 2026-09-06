-- Add the target Ev ve bag subcategories without changing legacy taxonomy rows.

do $migration$
declare
  ev_bag_category_count integer;
  ev_bag_category_id uuid;
  mebel_count integer;
begin
  select count(*)
  into ev_bag_category_count
  from public.categories
  where slug = 'ev-ve-bag';

  if ev_bag_category_count <> 1 then
    raise exception
      'Expected exactly one ev-ve-bag category, found %',
      ev_bag_category_count;
  end if;

  select id
  into ev_bag_category_id
  from public.categories
  where slug = 'ev-ve-bag';

  select count(*)
  into mebel_count
  from public.subcategories
  where category_id = ev_bag_category_id
    and slug = 'mebel';

  if mebel_count <> 1 then
    raise exception
      'Expected exactly one mebel subcategory under ev-ve-bag, found %',
      mebel_count;
  end if;

  update public.subcategories
  set sort_order = 80
  where category_id = ev_bag_category_id
    and slug = 'mebel'
    and sort_order is distinct from 80;

  insert into public.subcategories (category_id, slug, name, sort_order, is_active)
  select ev_bag_category_id, seed.slug, seed.name, seed.sort_order, true
  from (
    values
      ('bag-ve-bostan', 'Bağ və bostan', 10),
      ('bitkiler', 'Bitkilər', 20),
      ('dekor-ve-interyer', 'Dekor və interyer', 30),
      ('qida-ve-erzaq', 'Qida və ərzaq', 40),
      ('ev-ve-bag-ucun-isiqlandirma', 'Ev və bağ üçün işıqlandırma', 50),
      ('ev-tekstili', 'Ev tekstili', 60),
      ('ev-teserrufati-mallari', 'Ev təsərrüfatı malları', 70),
      ('qab-qacaq-ve-metbex-levazimatlari', 'Qab-qacaq və mətbəx ləvazimatları', 100),
      ('temir-ve-tikinti', 'Təmir və tikinti', 110),
      ('xalcalar-ve-aksesuarlar', 'Xalçalar və aksesuarlar', 120)
  ) as seed(slug, name, sort_order)
  on conflict (category_id, slug) do update
  set
    name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true;
end;
$migration$;
