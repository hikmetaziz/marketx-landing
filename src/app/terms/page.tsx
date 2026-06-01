import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/LegalPage";
import { SITE } from "@/constants/data";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "İstifadə razılaşması",
  description: `${SITE.name} istifadə razılaşması — ${SITE.domain}`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="MarktX İstifadə Razılaşması">
      <p>
        Bu razılaşma {SITE.name} platformasının ({SITE.domain}) istifadə qaydalarını müəyyən edir.
        Platformadan istifadə etməklə bu şərtlərlə razılaşırsınız.
      </p>

      <LegalSection title="1. Xidmətin xarakteri">
        <p>
          {SITE.name} alıcı və satıcı arasında elan yerləşdirmək, axtarış aparmaq və əlaqə yaratmaq
          üçün texniki vasitədir. {SITE.name} satıcı və ya alıcı deyil; tərəflər arasında
          bağlanan razılaşmanın tərəfi deyil.
        </p>
      </LegalSection>

      <LegalSection title="2. İstifadəçi məsuliyyəti">
        <p>
          Məhsulun keyfiyyəti, qiyməti, çatdırılması və ödəniş üsulu birbaşa alıcı və satıcı
          arasında razılaşılır. {SITE.name} bu münasibətlərə görə məsuliyyət daşımır.
        </p>
      </LegalSection>

      <LegalSection title="3. Qadağan olunmuş məzmun">
        <ul className="list-disc space-y-1 pl-5">
          <li>Qanunsuz, saxta və ya aldatma xarakterli elanlar</li>
          <li>Təhqiredici, zərərli və ya spam məzmun</li>
          <li>Üçüncü şəxslərin hüquqlarını pozan materiallar</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Moderasiya">
        <p>
          Qaydaların pozulması halında elan silinə, hesab məhdudlaşdırıla və ya bloklana bilər.
        </p>
      </LegalSection>

      <LegalSection title="5. Əlaqə">
        <p>
          Suallar üçün:{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-primary">
            {SITE.contactEmail}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
