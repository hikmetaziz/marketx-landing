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

  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [invalidReason, setInvalidReason] = useState(
    "Bərpa linkinin vaxtı bitib və ya artıq istifadə olunub. Tətbiqdə yenidən «Parolu unutmusunuz?» edib yeni email alın.",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const markReady = () => {
      if (mounted) setStatus("ready");
    };
    const markInvalid = (reason?: string) => {
      if (!mounted) return;
      if (reason) setInvalidReason(reason);
      setStatus((prev) => (prev === "ready" ? prev : "invalid"));
    };

    const readTokens = () => {
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = rawHash ? new URLSearchParams(rawHash) : null;
      const queryParams = new URLSearchParams(window.location.search);
      return {
        accessToken: hashParams?.get("access_token") ?? null,
        refreshToken: hashParams?.get("refresh_token") ?? null,
        code: queryParams.get("code"),
        error: queryParams.get("error_description") ?? queryParams.get("error"),
      };
    };

    const bootstrap = async () => {
      const tokens = readTokens();

      if (tokens.error) {
        markInvalid(tokens.error);
        return;
      }

      // Implicit flow (mobil app emaili): #access_token & refresh_token
      if (tokens.accessToken && tokens.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (!error) {
          markReady();
          return;
        }
      }

      // PKCE flow: ?code=
      if (tokens.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(tokens.code);
        if (!error) {
          markReady();
          return;
        }
        markInvalid(
          "Bu link köhnə formatdadır və brauzerdə açıla bilmir. Tətbiqi yeniləyin və YENİ parol bərpa linki göndərin.",
        );
        return;
      }

      // Artıq sessiya varsa (məs. detectSessionInUrl onu emal edibsə)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        markReady();
        return;
      }

      markInvalid();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        markReady();
      }
    });

    void bootstrap();

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

  if (status === "checking") {
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

  if (status === "invalid") {
    return (
      <div className="card-premium mx-auto max-w-md rounded-2xl p-6 text-center hover:translate-y-0">
        <h2 className="text-xl font-extrabold text-brand-text">Link işləmir</h2>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">{invalidReason}</p>
        <Link
          href="/login"
          className="btn-primary-premium mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
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
