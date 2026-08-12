alter table public.listings disable trigger listings_before_update;

update public.listings
set image_url = case
  when title ilike '%divan%' then 'sample://sofa'
  when title ilike '%masa%' and title not ilike '%kompüter%' then 'sample://table'
  when title ilike '%velosiped%' then 'sample://bicycle'
  when title ilike '%kreslo%' or title ilike '%stul%' then 'sample://chair'
  when title ilike '%rəf%' or title ilike '%ref%' or title ilike '%kitab%' then 'sample://bookshelf'
  when title ilike '%çaydan%' then 'sample://kettle'
  when title ilike '%gödəkçə%' then 'sample://jacket'
  when title ilike '%araba%' then 'sample://stroller'
  when title ilike '%kompüter%' or title ilike '%monitor%' or title ilike '%klaviatura%' then 'sample://desk'
  else null
end
where is_sample = true
  and source = 'sample'
  and image_url is null;

alter table public.listings enable trigger listings_before_update;
