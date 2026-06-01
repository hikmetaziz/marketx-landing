"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { translateAuthError, validatePassword } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => (isSupabaseConfigured() ? createClient() : null), []);

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="card-premium mx-auto max-w-md rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-sm text-brand-muted">Supabase konfiqurasiyası tapılmadı.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand-primary hover:underline">
          Daxil ol
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Parollar uyğun gəlmir.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    setInfoMessage("Parol yeniləndi. İndi yeni parolunuzla daxil ola bilərsiniz.");
    setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 1500);
  };

  if (!ready) {
    return (
      <div className="card-premium mx-auto max-w-md rounded-2xl p-6 text-center hover:translate-y-0">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-primary" />
        <p className="mt-4 text-sm text-brand-muted">Bərpa linki yoxlanılır...</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-brand-primary hover:underline"
        >
          Daxil ol səhifəsinə qayıt
        </Link>
      </div>
    );
  }

  return (
    <div className="card-premium mx-auto max-w-md rounded-2xl p-6 hover:translate-y-0">
      <h2 className="text-xl font-extrabold text-brand-text">Yeni parol</h2>
      <p className="mt-1 text-sm text-brand-muted">Hesabınız üçün yeni parol təyin edin.</p>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {infoMessage ? (
        <div className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary-light px-4 py-3 text-sm font-medium text-brand-primary-dark">
          {infoMessage}
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Yeni parol</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Parolu təsdiqlə</label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary-premium flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parolu yenilə"}
        </button>
      </form>
    </div>
  );
}
