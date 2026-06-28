-- MarktX: istifadəçini admin et
-- Supabase Dashboard → SQL Editor → yapışdır → Run
--
-- Aşağıdakı emaili ÖZ emailinizlə dəyişin (veb/mobil app-də qeydiyyatdan keçdiyiniz)

update public.profiles
set
  role = 'admin',
  updated_at = now()
where email = 'admin@marktx.az';

-- Yoxlama: admin siyahısı
select id, email, display_name, role, created_at
from public.profiles
where role = 'admin';

-- Əgər 0 sətir update olubsa, əvvəl həmin email ilə qeydiyyatdan keçin,
-- sonra bu SQL-i yenidən işlədin.
