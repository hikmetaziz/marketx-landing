import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { LoginPageContent } from "@/components/auth/LoginPageContent";
import { PageShell } from "@/components/layout/PageShell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Daxil ol",
  description: "MarktX hesabınıza daxil olun və ya qeydiyyatdan keçin.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <PageShell title="Daxil ol" subtitle="Hesabınıza daxil olun və ya qeydiyyatdan keçin.">
      <div className="mb-8 flex justify-center">
        <BrandLogo className="text-[2.25rem] sm:text-[3rem]" />
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-brand-muted">Yüklənir...</p>
        }
      >
        <LoginPageContent />
      </Suspense>
    </PageShell>
  );
}
