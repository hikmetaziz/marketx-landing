alter table public.listings
  add column if not exists is_sample boolean not null default false;

alter table public.listings
  add column if not exists source text not null default 'user';

alter table public.listings
  add column if not exists email text;

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

  if exists (select 1 from public.listings where is_sample = true or source = 'sample') then
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
    (v_sample_user_id, 'Az islenmis divan', 180, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Qonaq otağı üçün sadə və rahat divan. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '1 hour'),
    (v_sample_user_id, 'Taxta yemek masasi', 220, 'Ev və bağ', 'Sumqayıt', 'İşlənmiş', 'Dörd nəfərlik taxta masa. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '2 hours'),
    (v_sample_user_id, 'Uşaq velosipedi', 75, 'İdman və hobbi', 'Gəncə', 'İşlənmiş', 'Uşaq üçün gündəlik istifadəyə uyğun velosiped. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '3 hours'),
    (v_sample_user_id, 'Ofis kreslosu', 95, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Ev ofisi üçün rahat kreslo. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '4 hours'),
    (v_sample_user_id, 'Kitab rəfi', 60, 'Ev və bağ', 'Mingəçevir', 'İşlənmiş', 'Kiçik otaq üçün yığcam kitab rəfi. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '5 hours'),
    (v_sample_user_id, 'Mətbəx stulu dəsti', 140, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Dörd ədəd mətbəx stulu. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '6 hours'),
    (v_sample_user_id, 'Elektrikli çaydan', 35, 'Elektronika', 'Sumqayıt', 'İşlənmiş', 'Gündəlik istifadə üçün işlək elektrikli çaydan. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '7 hours'),
    (v_sample_user_id, 'Qulaqlıq', 28, 'Elektronika', 'Bakı', 'İşlənmiş', 'Sadə simli qulaqlıq. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '8 hours'),
    (v_sample_user_id, 'Planşet üçün çanta', 18, 'Elektronika', 'Şəki', 'Yeni', 'Planşet üçün qoruyucu çanta. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '9 hours'),
    (v_sample_user_id, 'Stolüstü lampa', 32, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Oxuma masası üçün lampa. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '10 hours'),
    (v_sample_user_id, 'Qış gödəkçəsi', 55, 'Geyim', 'Gəncə', 'İşlənmiş', 'Səliqəli saxlanılmış qış gödəkçəsi. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '11 hours'),
    (v_sample_user_id, 'İdman ayaqqabısı', 45, 'Geyim', 'Bakı', 'İşlənmiş', 'Gündəlik istifadə üçün rahat ayaqqabı. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '12 hours'),
    (v_sample_user_id, 'Bel çantası', 25, 'Geyim', 'Sumqayıt', 'Yeni', 'Səyahət və gündəlik istifadə üçün bel çantası. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '13 hours'),
    (v_sample_user_id, 'Uşaq oyuncaqları dəsti', 30, 'Uşaq aləmi', 'Bakı', 'İşlənmiş', 'Bir neçə sadə oyuncaqdan ibarət dəst. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '14 hours'),
    (v_sample_user_id, 'Uşaq arabası', 160, 'Uşaq aləmi', 'Gəncə', 'İşlənmiş', 'Gəzinti üçün uşaq arabası. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '15 hours'),
    (v_sample_user_id, 'Məktəb çantası', 22, 'Uşaq aləmi', 'Şirvan', 'Yeni', 'Məktəb üçün yüngül çanta. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '16 hours'),
    (v_sample_user_id, 'Avtomobil oturacaq üzlüyü', 50, 'Avto', 'Bakı', 'Yeni', 'Universal ölçülü oturacaq üzlüyü. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '17 hours'),
    (v_sample_user_id, 'Velosiped dəbilqəsi', 38, 'İdman və hobbi', 'Sumqayıt', 'İşlənmiş', 'Təhlükəsiz sürüş üçün dəbilqə. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '18 hours'),
    (v_sample_user_id, 'Gitara üçün çanta', 40, 'İdman və hobbi', 'Bakı', 'İşlənmiş', 'Akustik gitara üçün qoruyucu çanta. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '19 hours'),
    (v_sample_user_id, 'Rəsm dəsti', 20, 'İdman və hobbi', 'Lənkəran', 'Yeni', 'Başlanğıc üçün rəsm ləvazimatları. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '20 hours'),
    (v_sample_user_id, 'Kiçik xalça', 70, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Dəhliz və kiçik otaq üçün xalça. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '21 hours'),
    (v_sample_user_id, 'Pərdə dəsti', 65, 'Ev və bağ', 'Gəncə', 'İşlənmiş', 'İki pəncərə üçün pərdə dəsti. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '22 hours'),
    (v_sample_user_id, 'Qab-qacaq dəsti', 85, 'Ev və bağ', 'Sumqayıt', 'Yeni', 'Mətbəx üçün sadə qab-qacaq dəsti. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '23 hours'),
    (v_sample_user_id, 'Monitor stendi', 27, 'Elektronika', 'Bakı', 'Yeni', 'İş masası üçün monitor stendi. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '24 hours'),
    (v_sample_user_id, 'Klaviatura', 33, 'Elektronika', 'Şəki', 'İşlənmiş', 'Gündəlik yazı işi üçün klaviatura. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '25 hours'),
    (v_sample_user_id, 'Kompüter masası', 120, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Ev ofisi üçün kompüter masası. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '26 hours'),
    (v_sample_user_id, 'Səyahət çamadanı', 90, 'Digər', 'Sumqayıt', 'İşlənmiş', 'Orta ölçülü səyahət çamadanı. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '27 hours'),
    (v_sample_user_id, 'Termos', 16, 'Digər', 'Bakı', 'Yeni', 'İsti və soyuq içkilər üçün termos. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '28 hours'),
    (v_sample_user_id, 'Divar saatı', 24, 'Ev və bağ', 'Mingəçevir', 'Yeni', 'Sadə dizaynlı divar saatı. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '29 hours'),
    (v_sample_user_id, 'Ayaqqabı rəfi', 48, 'Ev və bağ', 'Bakı', 'İşlənmiş', 'Giriş üçün yığcam ayaqqabı rəfi. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '30 hours'),
    (v_sample_user_id, 'Uşaq kitabları', 19, 'Uşaq aləmi', 'Gəncə', 'İşlənmiş', 'Müxtəlif yaşlar üçün uşaq kitabları. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '31 hours'),
    (v_sample_user_id, 'Mətbəx tərəzisi', 26, 'Ev və bağ', 'Bakı', 'Yeni', 'Kiçik elektron mətbəx tərəzisi. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '32 hours'),
    (v_sample_user_id, 'Telefon üçün tutacaq', 12, 'Avto', 'Sumqayıt', 'Yeni', 'Avtomobil salonu üçün telefon tutacağı. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '33 hours'),
    (v_sample_user_id, 'İdman çantası', 36, 'İdman və hobbi', 'Bakı', 'İşlənmiş', 'Məşq və qısa səfərlər üçün idman çantası. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '34 hours'),
    (v_sample_user_id, 'Çiçək dibçəkləri', 18, 'Ev və bağ', 'Şəki', 'Yeni', 'Ev bitkiləri üçün bir neçə dibçək. Nümunə elan kimi göstərilir.', false, null, null, null, null, 'active', true, 'sample', now() - interval '35 hours'),
    (v_sample_user_id, 'Kiçik alət qutusu', 42, 'Digər', 'Bakı', 'İşlənmiş', 'Ev təmiri üçün sadə alət qutusu. Nümunə elan kimi göstərilir.', true, null, null, null, null, 'active', true, 'sample', now() - interval '36 hours');

  alter table public.listings enable trigger listings_before_insert;
end;
$$;
