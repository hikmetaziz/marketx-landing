"use client";

import { useSearchParams } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { isCreateListingReturnPath, sanitizeInternalPath } from "@/lib/safe-path";

export function LoginPageContent() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeInternalPath(searchParams.get("returnTo"));
  const wantsCreateListing = isCreateListingReturnPath(returnTo);

  return (
    <>
      {wantsCreateListing ? (
        <p className="mb-4 rounded-xl border border-brand-primary/20 bg-brand-primary-light px-4 py-3 text-sm font-medium text-brand-primary-dark">
          Elan yerləşdirmək üçün hesab lazımdır — qeydiyyatdan keçin və ya daxil olun.
        </p>
      ) : null}
      <LoginForm />
    </>
  );
}
