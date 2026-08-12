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
  select
    v_sample_user_id,
    sample.title,
    sample.price,
    sample.category,
    sample.city,
    sample.condition,
    sample.description,
    sample.delivery_available,
    null,
    null,
    sample.image_url,
    null,
    sample.status::public.listing_status,
    true,
    'sample',
    sample.created_at
  from (
    values
      ('Yumşaq kreslo', 110, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Qonaq otağı üçün yumşaq kreslo. Nümunə elan kimi göstərilir.', false, 'sample://chair', 'active', now() - interval '59 hours'),
      ('Kiçik jurnal masası', 75, 'Ev və bağ', 'Sumqayıt', 'İşlənmiş', 'Qonaq otağı üçün kompakt jurnal masası. Nümunə elan kimi göstərilir.', true, 'sample://table', 'active', now() - interval '60 hours'),
      ('Açıq rəngli divan', 260, 'Ev və bağ', 'Gəncə', 'İşlənmiş', 'Səliqəli saxlanılmış açıq rəngli divan. Nümunə elan kimi göstərilir.', true, 'sample://sofa', 'active', now() - interval '61 hours'),
      ('Kitablıq dolabı', 95, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Kitab və dekor əşyaları üçün kitablıq. Nümunə elan kimi göstərilir.', false, 'sample://bookshelf', 'active', now() - interval '62 hours'),
      ('Oxu lampası', 29, 'Ev və bağ', 'Şəki', 'Yeni', 'Masa üstü istifadə üçün oxu lampası. Nümunə elan kimi göstərilir.', false, 'sample://lamp', 'active', now() - interval '63 hours'),
      ('Çaydan dəsti', 38, 'Ev və bağ', 'Mingəçevir', 'İşlənmiş', 'Gündəlik istifadə üçün çaydan dəsti. Nümunə elan kimi göstərilir.', true, 'sample://kettle', 'active', now() - interval '64 hours'),
      ('Smartfon qoruyucu qabı', 15, 'Telefon', 'Bakı', 'Yeni', 'Telefon üçün sadə qoruyucu qab. Nümunə elan kimi göstərilir.', false, 'sample://phone-case', 'active', now() - interval '65 hours'),
      ('Telefon şarj adapteri', 22, 'Telefon', 'Sumqayıt', 'Yeni', 'Telefon üçün adapter və kabel dəsti. Nümunə elan kimi göstərilir.', false, 'sample://phone-charger', 'active', now() - interval '66 hours'),
      ('Qara telefon 256 GB', 520, 'Telefon', 'Bakı', 'İşlənmiş', '256 GB yaddaşlı qara telefon nümunəsi. Nümunə elan kimi göstərilir.', true, 'sample://phone-black', 'active', now() - interval '67 hours'),
      ('Gümüşü telefon 128 GB', 470, 'Telefon', 'Gəncə', 'İşlənmiş', '128 GB yaddaşlı gümüşü telefon nümunəsi. Nümunə elan kimi göstərilir.', false, 'sample://phone-silver', 'active', now() - interval '68 hours'),
      ('Velosiped aksesuarı', 34, 'Digər', 'Lənkəran', 'Yeni', 'Velosiped üçün gündəlik istifadə aksesuarı. Nümunə elan kimi göstərilir.', false, 'sample://bicycle', 'active', now() - interval '69 hours'),
      ('Yüngül idman ayaqqabısı', 52, 'Geyim', 'Bakı', 'İşlənmiş', 'Gündəlik geyim üçün yüngül idman ayaqqabısı. Nümunə elan kimi göstərilir.', true, 'sample://shoe', 'active', now() - interval '70 hours'),
      ('Gündəlik çanta', 31, 'Geyim', 'Sumqayıt', 'Yeni', 'Gündəlik istifadə üçün sadə çanta. Nümunə elan kimi göstərilir.', true, 'sample://bag', 'active', now() - interval '71 hours'),
      ('Payız gödəkçəsi', 68, 'Geyim', 'Bakı', 'İşlənmiş', 'Sərin hava üçün payız gödəkçəsi. Nümunə elan kimi göstərilir.', false, 'sample://jacket', 'active', now() - interval '72 hours'),
      ('Uşaq konstruktor oyuncağı', 27, 'Uşaq aləmi', 'Gəncə', 'İşlənmiş', 'Uşaqlar üçün konstruktor tipli oyuncaq. Nümunə elan kimi göstərilir.', false, 'sample://toy', 'active', now() - interval '73 hours'),
      ('Yığcam uşaq arabası', 145, 'Uşaq aləmi', 'Bakı', 'İşlənmiş', 'Gəzinti üçün yığcam uşaq arabası. Nümunə elan kimi göstərilir.', true, 'sample://stroller', 'active', now() - interval '74 hours'),
      ('İş masası üçün monitor', 170, 'Elektronika', 'Bakı', 'İşlənmiş', 'İş masası üçün sadə monitor nümunəsi. Nümunə elan kimi göstərilir.', false, 'sample://desk', 'active', now() - interval '75 hours'),
      ('Kiçik televizor', 240, 'Elektronika', 'Sumqayıt', 'İşlənmiş', 'Kiçik otaq üçün televizor nümunəsi. Nümunə elan kimi göstərilir.', false, 'sample://tv', 'active', now() - interval '76 hours')
  ) as sample(title, price, category, city, condition, description, delivery_available, image_url, status, created_at)
  where not exists (
    select 1
    from public.listings as existing
    where existing.is_sample = true
      and existing.source = 'sample'
      and existing.title = sample.title
  );

  alter table public.listings enable trigger listings_before_insert;
end;
$$;
