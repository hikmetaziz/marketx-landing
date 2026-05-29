import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/LegalPage";
import { SITE } from "@/constants/data";

export const metadata: Metadata = {
  title: "Gizlilik siyasəti",
  description: `${SITE.name} gizlilik siyasəti — ${SITE.domain}`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const updated = "29 may 2026";

  return (
    <LegalPage title="MarktX Gizlilik Siyasəti">
      <p>
        Bu Gizlilik Siyasəti <strong className="text-brand-text">{SITE.name}</strong> platforması
        ({SITE.legalScope}) üzrə şəxsi məlumatlarınızın necə toplandığını, istifadə edildiyini,
        saxlanıldığını və qorunduğunu izah edir. Platformadan istifadə etməklə bu siyasətlə
        tanış olduğunuzu qəbul edirsiniz.
      </p>
      <p className="text-xs text-brand-muted">Son yenilənmə: {updated}</p>

      <LegalSection title="1. Məlumat operatoru">
        <p>
          Platforma: {SITE.name}
          <br />
          Rəsmi veb ünvan:{" "}
          <a href={SITE.url} className="font-semibold text-brand-primary">
            {SITE.domain}
          </a>
          <br />
          Əlaqə:{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-primary">
            {SITE.contactEmail}
          </a>
          <br />
          Ünvan: {SITE.location}
        </p>
      </LegalSection>

      <LegalSection title="2. Toplanan məlumatlar">
        <p>Platformadan istifadə zamanı aşağıdakı məlumat növləri toplana bilər:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hesab məlumatları (e-poçt, profil adı, profil şəkli)</li>
          <li>Elan məlumatları (başlıq, təsvir, qiymət, şəkillər, şəhər, kateqoriya)</li>
          <li>Əlaqə məlumatları (telefon nömrəsi — istifadəçi daxil edərsə)</li>
          <li>Mesajlaşma məzmunu (alıcı və satıcı arasında)</li>
          <li>Texniki məlumatlar (cihaz növü, OS versiyası, IP ünvanı, tətbiq versiyası, log qeydləri)</li>
          <li>İstifadə analitikası (səhifə baxışları, axtarış sorğuları, interaksiya məlumatları)</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Məlumatların istifadə məqsədi">
        <p>Toplanan məlumatlar aşağıdakı məqsədlər üçün istifadə olunur:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hesabın yaradılması, autentifikasiya və idarə edilməsi</li>
          <li>Elanların yerləşdirilməsi, moderasiya və göstərilməsi</li>
          <li>Alıcı və satıcı arasında əlaqənin təmin edilməsi</li>
          <li>Platforma təhlükəsizliyinin qorunması və fırıldaqçılığın qarşısının alınması</li>
          <li>Dəstək xidməti və istifadəçi sorğularının cavablandırılması</li>
          <li>Xidmət keyfiyyətinin yaxşılaşdırılması və analitika</li>
          <li>Hüquqi öhdəliklərin yerinə yetirilməsi</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Hüquqi əsas">
        <p>
          Məlumatlar istifadəçi razılığı, müqavilənin icrası, qanuni maraq və qanunvericiliyin
          tələblərinə uyğun olaraq emal edilə bilər.
        </p>
      </LegalSection>

      <LegalSection title="5. Üçüncü tərəflərlə paylaşım">
        <p>
          {SITE.name} məlumatları yalnız zəruri həddə və aşağıdakı hallarda paylaşa bilər:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Texniki xidmət provayderləri (hostinq, analitika, autentifikasiya, bildiriş xidmətləri)</li>
          <li>Qanunvericiliyin tələb etdiyi hallarda dövlət orqanları</li>
          <li>Platforma təhlükəsizliyinin qorunması üçün zəruri olduqda</li>
        </ul>
        <p>
          Məlumatlar reklam məqsədilə satılmır. Xidmət provayderləri müqavilə əsasında məlumatları
          qorumağa borcludur.
        </p>
      </LegalSection>

      <LegalSection title="6. Saxlama müddəti">
        <p>
          Məlumatlar xidmətin göstərilməsi üçün zəruri olduğu müddət ərzində saxlanılır. Hesab
          silindikdən sonra məlumatlar hüquqi öhdəlik və ya təhlükəsizlik məqsədilə müəyyən müddət
          arxivlənə bilər.
        </p>
      </LegalSection>

      <LegalSection title="7. İstifadəçi hüquqları">
        <p>İstifadəçi aşağıdakı hüquqlara malikdir:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Öz məlumatlarına çıxış tələb etmək</li>
          <li>Düzəliş və ya yeniləmə tələb etmək</li>
          <li>Hesabın və məlumatların silinməsini tələb etmək</li>
          <li>Emala etiraz bildirmək (qanunvericiliyə uyğun hallarda)</li>
          <li>Razılığı geri götürmək (autentifikasiya tələb edən xidmətlər istisna olmaqla)</li>
        </ul>
        <p>
          Sorğular üçün:{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-primary">
            {SITE.contactEmail}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="8. Uşaqlar">
        <p>
          {SITE.name} 13 yaşdan kiçik şəxslər üçün nəzərdə tutulmayıb. Belə məlumat aşkar
          edilərsə, silinməsi üçün tədbir görüləcək.
        </p>
      </LegalSection>

      <LegalSection title="9. Təhlükəsizlik">
        <p>
          Məlumatların qorunması üçün texniki və təşkilati tədbirlər (şifrələmə, giriş nəzarəti,
          moderasiya) tətbiq edilir. Heç bir sistem tam zəmanətli deyil; istifadəçi də şəxsi
          məlumatlarını qorumağa borcludur.
        </p>
      </LegalSection>

      <LegalSection title="10. Beynəlxalq ötürmə">
        <p>
          Məlumatlar xidmət provayderlərinin infrastrukturu səbəbindən Azərbaycan xaricində
          emal edilə bilər. Belə hallarda müvafiq qoruma tədbirləri tətbiq edilir.
        </p>
      </LegalSection>

      <LegalSection title="11. Dəyişikliklər">
        <p>
          Bu siyasət vaxtaşırı yenilənə bilər. Yenilənmiş versiya {SITE.domain} ünvanında
          dərc ediləcək. Davam edən istifadə yenilənmiş siyasətin qəbulu sayılır.
        </p>
      </LegalSection>

      <LegalSection title="12. Əlaqə">
        <p>
          Gizliliklə bağlı suallar və müraciətlər üçün:
          <br />
          E-poçt:{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-primary">
            {SITE.contactEmail}
          </a>
          <br />
          Veb:{" "}
          <a href={SITE.url} className="font-semibold text-brand-primary">
            {SITE.domain}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
