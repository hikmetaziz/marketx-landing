alter table public.listings
  add column if not exists contact_phone text;

comment on column public.listings.contact_phone is 'Satıcının elan üzrə əlaqə telefonu (+994...)';
