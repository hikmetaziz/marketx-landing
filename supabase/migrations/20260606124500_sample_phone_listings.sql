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

  if exists (
    select 1
    from public.listings
    where is_sample = true
      and source = 'sample'
      and category = 'Elektronika'
      and title ilike '%smartfon%'
  ) then
    return;
  end if;

  alter table public.listings disable trigger listings_before_insert;

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
  values
    (v_sample_user_id, 'Qara smartfon 128 GB', 420, 'Elektronika', 'Bakı', 'İşlənmiş', 'Yaddaşı 128 GB olan qara smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-black', null, 'active', true, 'sample', now() - interval '37 hours'),
    (v_sample_user_id, 'Gümüşü smartfon 64 GB', 310, 'Elektronika', 'Sumqayıt', 'İşlənmiş', 'Gündəlik istifadə üçün gümüşü smartfon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-silver', null, 'active', true, 'sample', now() - interval '38 hours'),
    (v_sample_user_id, 'Keysli qara smartfon', 390, 'Elektronika', 'Gəncə', 'İşlənmiş', 'Qoruyucu keys ilə birlikdə qara smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-case', null, 'active', true, 'sample', now() - interval '39 hours'),
    (v_sample_user_id, 'Adapterli smartfon dəsti', 460, 'Elektronika', 'Bakı', 'İşlənmiş', 'Telefon və kabeldən ibarət sadə dəst. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-charger', null, 'active', true, 'sample', now() - interval '40 hours'),
    (v_sample_user_id, 'Qara ekranlı smartfon', 280, 'Elektronika', 'Şəki', 'İşlənmiş', 'Ekranı səliqəli saxlanılmış qara smartfon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-black', null, 'active', true, 'sample', now() - interval '41 hours'),
    (v_sample_user_id, 'Nazik korpuslu smartfon', 350, 'Elektronika', 'Bakı', 'İşlənmiş', 'Nazik korpuslu gümüşü smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-silver', null, 'active', true, 'sample', now() - interval '42 hours'),
    (v_sample_user_id, 'Qoruyucu kaburalı smartfon', 330, 'Elektronika', 'Mingəçevir', 'İşlənmiş', 'Qoruyucu kabura ilə saxlanılmış smartfon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-case', null, 'active', true, 'sample', now() - interval '43 hours'),
    (v_sample_user_id, 'Kabel ilə smartfon', 370, 'Elektronika', 'Bakı', 'İşlənmiş', 'Kabel ilə birlikdə verilən smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-charger', null, 'active', true, 'sample', now() - interval '44 hours'),
    (v_sample_user_id, '128 GB qara telefon', 440, 'Elektronika', 'Sumqayıt', 'İşlənmiş', '128 GB yaddaşlı qara telefon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-black', null, 'active', true, 'sample', now() - interval '45 hours'),
    (v_sample_user_id, '64 GB gümüşü telefon', 300, 'Elektronika', 'Gəncə', 'İşlənmiş', '64 GB yaddaşlı gümüşü telefon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-silver', null, 'active', true, 'sample', now() - interval '46 hours'),
    (v_sample_user_id, 'Qara keysli telefon', 360, 'Elektronika', 'Bakı', 'İşlənmiş', 'Qara qoruyucu keysli telefon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-case', null, 'active', true, 'sample', now() - interval '47 hours'),
    (v_sample_user_id, 'Kabeli olan telefon', 340, 'Elektronika', 'Lənkəran', 'İşlənmiş', 'Kabel ilə birlikdə göstərilən telefon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-charger', null, 'active', true, 'sample', now() - interval '48 hours'),
    (v_sample_user_id, 'Səliqəli qara smartfon', 295, 'Elektronika', 'Bakı', 'İşlənmiş', 'Səliqəli vəziyyətdə qara smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-black', null, 'active', true, 'sample', now() - interval '49 hours'),
    (v_sample_user_id, 'Gümüşü korpuslu smartfon', 385, 'Elektronika', 'Sumqayıt', 'İşlənmiş', 'Gümüşü korpuslu smartfon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-silver', null, 'active', true, 'sample', now() - interval '50 hours'),
    (v_sample_user_id, 'Keysli smartfon 128 GB', 430, 'Elektronika', 'Bakı', 'İşlənmiş', '128 GB yaddaşlı keysli smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-case', null, 'active', true, 'sample', now() - interval '51 hours'),
    (v_sample_user_id, 'Smartfon və kabel', 320, 'Elektronika', 'Şirvan', 'İşlənmiş', 'Smartfon və kabel birlikdə göstərilir. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-charger', null, 'active', true, 'sample', now() - interval '52 hours'),
    (v_sample_user_id, 'Qara smartfon yaxşı vəziyyətdə', 410, 'Elektronika', 'Bakı', 'İşlənmiş', 'Yaxşı vəziyyətdə saxlanılmış qara smartfon. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-black', null, 'active', true, 'sample', now() - interval '53 hours'),
    (v_sample_user_id, 'Gümüşü smartfon yaxşı vəziyyətdə', 405, 'Elektronika', 'Gəncə', 'İşlənmiş', 'Yaxşı vəziyyətdə saxlanılmış gümüşü smartfon. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-silver', null, 'active', true, 'sample', now() - interval '54 hours'),
    (v_sample_user_id, 'Qoruyucu keysli smartfon', 375, 'Elektronika', 'Sumqayıt', 'İşlənmiş', 'Qoruyucu keysli smartfon nümunəsi. Nümunə elan kimi göstərilir.', true, null, null, 'sample://phone-case', null, 'active', true, 'sample', now() - interval '55 hours'),
    (v_sample_user_id, 'Kabel dəstli smartfon', 395, 'Elektronika', 'Bakı', 'İşlənmiş', 'Kabel dəsti ilə smartfon nümunəsi. Nümunə elan kimi göstərilir.', false, null, null, 'sample://phone-charger', null, 'active', true, 'sample', now() - interval '56 hours');

  alter table public.listings enable trigger listings_before_insert;
end;
$$;
