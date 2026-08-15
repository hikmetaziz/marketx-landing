"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { signOutWithCleanup } from "@/lib/auth/sign-out";
import {
  isEmailConfirmed,
  translateAuthError,
  validateEmail,
  validateFullName,
  validatePassword,
} from "@/lib/auth";
import {
  isCreateListingReturnPath,
  resolveAuthReturnTo,
  sanitizeInternalPath,
} from "@/lib/safe-path";
import {
  createPasswordResetClient,
  getAuthRedirectUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/supabase/use-auth-user";

type AuthMode = "login" | "register";
type LoadingAction = "login" | "signup" | "reset" | null;

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  showPassword,
  onToggle,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-brand-text">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={label === "Parol" ? "current-password" : "new-password"}
          className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 pr-11 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition-colors hover:text-brand-text"
          onClick={onToggle}
          aria-label={showPassword ? "Parolu gizlət" : "Parolu göstər"}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = resolveAuthReturnTo(sanitizeInternalPath(searchParams.get("returnTo")));
  const wantsCreateListing = isCreateListingReturnPath(
    sanitizeInternalPath(searchParams.get("returnTo")),
  );
  const initialMode: AuthMode =
    searchParams.get("mode") === "login"
      ? "login"
      : searchParams.get("mode") === "register" || wantsCreateListing
        ? "register"
        : "login";
  const callbackError = searchParams.get("error") === "auth_callback";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [errorMessage, setErrorMessage] = useState(callbackError ? "Giriş linki etibarsızdır və ya vaxtı bitib." : "");
  const [infoMessage, setInfoMessage] = useState("");

  const { supabase, user: authUser, loading: authLoading, isAuthenticated } = useAuthUser();
  const normalizedEmail = email.trim().toLowerCase();
  const loading = loadingAction !== null;
  const isRegisterForm = mode === "register";
  const hasExistingSession = !authLoading && isAuthenticated && Boolean(authUser);
  const displayName = hasExistingSession
    ? ((authUser?.user_metadata?.display_name as string | undefined) ??
      authUser?.email?.split("@")[0] ??
      "İstifadəçi")
    : null;

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="card-premium mx-auto max-w-md rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-sm leading-relaxed text-brand-muted">
          Supabase konfiqurasiyası tapılmadı. <code className="text-brand-text">.env.local</code> faylına URL və
          anon key əlavə edin.
        </p>
      </div>
    );
  }

  const clearMessages = () => {
    setErrorMessage("");
    setInfoMessage("");
  };

  const goAfterAuth = () => {
    router.replace(returnTo);
    router.refresh();
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowForgotPassword(false);
    clearMessages();
  };

  const handleSignOut = async () => {
    setLoadingAction("login");
    await signOutWithCleanup(supabase);
    setLoadingAction(null);
    clearMessages();
    router.refresh();
  };

  const handleSignIn = async () => {
    clearMessages();

    if (!normalizedEmail) {
      setErrorMessage("Email ünvanını daxil edin.");
      return;
    }
    if (!password) {
      setErrorMessage("Şifrəni daxil edin.");
      return;
    }

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    setLoadingAction("login");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoadingAction(null);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    if (!isEmailConfirmed(data.session?.user ?? null)) {
      await supabase.auth.signOut({ scope: "local" });
      setErrorMessage("Email təsdiqlənməyib. Poçt qutunuzdakı təsdiq linkinə klik edin.");
      return;
    }

    goAfterAuth();
  };

  const handleSignUp = async () => {
    clearMessages();

    const trimmedName = name.trim().replace(/\s+/g, " ");
    const nameError = validateFullName(trimmedName);
    if (nameError) {
      setErrorMessage(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Parollar uyğun gəlmir.");
      return;
    }
    if (!termsAccepted) {
      setErrorMessage("İstifadəçi Razılaşması və Məxfilik Siyasəti ilə razı olmalısınız.");
      return;
    }

    setLoadingAction("signup");
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(
          `/auth/callback?next=${encodeURIComponent(returnTo)}`,
        ),
        data: {
          display_name: trimmedName,
          full_name: trimmedName,
        },
      },
    });
    setLoadingAction(null);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    if (data.session) {
      goAfterAuth();
      return;
    }

    setInfoMessage("Qeydiyyat yaradıldı. Email ünvanınızı təsdiqləyin, sonra daxil olun.");
    setPassword("");
    setConfirmPassword("");
    setMode("login");
  };

  const handleForgotPassword = async () => {
    clearMessages();

    const emailError = validateEmail(email);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    setLoadingAction("reset");
    const resetSupabase = createPasswordResetClient();
    const { error } = await resetSupabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthRedirectUrl("/reset-password"),
    });
    setLoadingAction(null);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    setShowForgotPassword(false);
    setMode("login");
    setInfoMessage("Əgər bu email qeydiyyatdadırsa, şifrə sıfırlama linki göndərildi.");
  };

  if (hasExistingSession) {
    return (
      <div className="card-premium mx-auto max-w-md rounded-2xl p-6 text-center hover:translate-y-0">
        <p className="text-lg font-bold text-brand-text">Xoş gəldiniz, {displayName}!</p>
        <p className="mt-2 text-sm text-brand-muted">Artıq hesabınıza daxil olmusunuz.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={returnTo}
            className="btn-primary-premium inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          >
            Davam et
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Çıxış"}
          </button>
        </div>
      </div>
    );
  }

  const cardTitle = showForgotPassword ? "Parolu bərpa et" : mode === "login" ? "Xoş gəldiniz" : "Qeydiyyat";
  const cardSubtitle = showForgotPassword
    ? "Email ünvanınıza bərpa linki göndərəcəyik"
    : mode === "login"
      ? "Hesabınıza daxil olun"
      : "Yeni hesab yaradın";

  return (
    <div className="card-premium mx-auto max-w-md rounded-2xl p-6 hover:translate-y-0">
      <h2 className="text-xl font-extrabold text-brand-text">{cardTitle}</h2>
      <p className="mt-1 text-sm text-brand-muted">{cardSubtitle}</p>

      {wantsCreateListing && !showForgotPassword ? (
        <p className="mt-3 rounded-xl border border-brand-primary/20 bg-brand-primary-light px-3 py-2.5 text-sm font-medium text-brand-primary-dark">
          Elan yerləşdirmək üçün qeydiyyatdan keçin və ya daxil olun.
        </p>
      ) : null}

      {!showForgotPassword ? (
        <div className="mt-5 flex rounded-xl border border-brand-border bg-brand-surface p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted"
            }`}
            onClick={() => switchMode("login")}
            disabled={loading}
          >
            Daxil ol
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              mode === "register" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted"
            }`}
            onClick={() => switchMode("register")}
            disabled={loading}
          >
            Qeydiyyat
          </button>
        </div>
      ) : null}

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

      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (showForgotPassword) {
            void handleForgotPassword();
          } else if (mode === "login") {
            void handleSignIn();
          } else {
            void handleSignUp();
          }
        }}
      >
        {isRegisterForm && !showForgotPassword ? (
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-text">Ad və soyad</label>
            <input
              type="text"
              placeholder="Məs: Əli Məmmədov"
              autoComplete="name"
              className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold text-brand-text">Email</label>
          <input
            type="email"
            placeholder="Email ünvanınız"
            autoComplete="email"
            className="w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {!showForgotPassword ? (
          <>
            <PasswordField
              label="Parol"
              placeholder={isRegisterForm ? "8+ simvol, hərf və !@#" : "Parolunuz"}
              value={password}
              onChange={setPassword}
              showPassword={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />

            {isRegisterForm ? (
              <>
                <PasswordField
                  label="Parolu təsdiqlə"
                  placeholder="Parolu təkrarlayın"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  showPassword={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                />
                <p className="text-xs text-brand-muted">Parol: ən azı 8 simvol, hərf və xüsusi simvol</p>
                <label className="flex items-start gap-3 text-sm text-brand-text">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>
                    <Link href="/terms" className="font-semibold text-brand-primary hover:underline">
                      İstifadəçi Razılaşması
                    </Link>
                    {" və "}
                    <Link href="/privacy" className="font-semibold text-brand-primary hover:underline">
                      Məxfilik Siyasəti
                    </Link>
                    {" ilə razıyam"}
                  </span>
                </label>
              </>
            ) : (
              <button
                type="button"
                className="text-sm font-semibold text-brand-primary hover:underline"
                onClick={() => {
                  setShowForgotPassword(true);
                  clearMessages();
                }}
                disabled={loading}
              >
                Şifrəni unutmusunuz?
              </button>
            )}
          </>
        ) : null}

        {showForgotPassword ? (
          <>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-premium flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loadingAction === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bərpa linki göndər"}
            </button>
            <button
              type="button"
              disabled={loading}
              className="w-full rounded-xl border border-brand-border py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-70"
              onClick={() => {
                setShowForgotPassword(false);
                clearMessages();
              }}
            >
              Geri — daxil ol
            </button>
          </>
        ) : mode === "login" ? (
          <>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-premium flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loadingAction === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Daxil ol"}
            </button>
            <p className="text-center text-sm text-brand-muted">
              Hesabınız yoxdur?{" "}
              <button
                type="button"
                className="font-semibold text-brand-primary hover:underline"
                onClick={() => switchMode("register")}
                disabled={loading}
              >
                Qeydiyyatdan keçin
              </button>
            </p>
          </>
        ) : (
          <>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-premium flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loadingAction === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Qeydiyyatdan keç"}
            </button>
            <p className="text-center text-sm text-brand-muted">
              Artıq hesabınız var?{" "}
              <button
                type="button"
                className="font-semibold text-brand-primary hover:underline"
                onClick={() => switchMode("login")}
                disabled={loading}
              >
                Daxil olun
              </button>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
