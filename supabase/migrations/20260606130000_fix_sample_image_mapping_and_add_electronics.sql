do $$
declare
  v_sample_user_id uuid;
begin
  select u.id
  into v_sample_user_id
  from auth.users as u
  order by u.created_at asc
  limit 1;

  if v_sample_user_id is null then
    return;
  end if;

  alter table public.listings disable trigger listings_before_update;
  alter table public.listings disable trigger listings_before_insert;

  update public.listings
  set image_url = case title
    when 'İdman ayaqqabısı' then 'sample://shoe'
    when 'Bel çantası' then 'sample://bag'
    when 'Qış gödəkçəsi' then 'sample://jacket'
    when 'Uşaq arabası' then 'sample://stroller'
    when 'Uşaq oyuncaqları dəsti' then 'sample://toy'
    when 'Stolüstü lampa' then 'sample://lamp'
    else image_url
  end,
  image_urls = null,
  contact_phone = null,
  email = null
  where is_sample = true
    and source = 'sample'
    and title in (
      'İdman ayaqqabısı',
      'Bel çantası',
      'Qış gödəkçəsi',
      'Uşaq arabası',
      'Uşaq oyuncaqları dəsti',
      'Stolüstü lampa'
    );

  if not exists (
    select 1 from public.listings
    where is_sample = true
      and source = 'sample'
      and title = 'iPhone 13'
  ) then
    insert into public.listings (
      user_id,
      title,
      price,
      category,
      city,
      condition,
      description,
      delivery_available,
      contact_phone,
      email,
      image_url,
      image_urls,
      status,
      is_sample,
      source,
      created_at
    )
    values (
      v_sample_user_id,
      'iPhone 13',
      850,
      'Elektronika',
      'Bakı',
      'İşlənmiş',
      '128 GB yaddaşlı telefon nümunəsi. Nümunə elan kimi göstərilir.',
      true,
      null,
      null,
      'sample://phone-silver',
      null,
      'active',
      true,
      'sample',
      now() - interval '57 hours'
    );
  end if;

  if not exists (
    select 1 from public.listings
    where is_sample = true
      and source = 'sample'
      and title = 'Smart TV'
  ) then
    insert into public.listings (
      user_id,
      title,
      price,
      category,
      city,
      condition,
      description,
      delivery_available,
      contact_phone,
      email,
      image_url,
      image_urls,
      status,
      is_sample,
      source,
      created_at
    )
    values (
      v_sample_user_id,
      'Smart TV',
      620,
      'Elektronika',
      'Bakı',
      'İşlənmiş',
      'Qonaq otağı üçün smart televizor nümunəsi. Nümunə elan kimi göstərilir.',
      false,
      null,
      null,
      'sample://tv',
      null,
      'active',
      true,
      'sample',
      now() - interval '58 hours'
    );
  end if;

  alter table public.listings enable trigger listings_before_insert;
  alter table public.listings enable trigger listings_before_update;
end;
$$;
