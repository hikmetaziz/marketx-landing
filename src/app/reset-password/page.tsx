import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { PageShell } from "@/components/layout/PageShell";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Parolu bərpa et",
  description: "MarktX hesabınız üçün yeni parol təyin edin.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <PageShell title="Parolu bərpa et" subtitle="Email ünvanınıza göndərilən linkdən sonra yeni parol təyin edin.">
      <ResetPasswordForm />
    </PageShell>
  );
}
