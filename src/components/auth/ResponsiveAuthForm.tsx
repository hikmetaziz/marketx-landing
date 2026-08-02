"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";

import {
  isAuthConfirmed,
  translateAuthError,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhoneNumber,
} from "@/lib/auth";
import { CONTACT_PHONE_VALIDATION_MESSAGE, normalizeContactPhone } from "@/lib/contact-phone";
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
type LoadingAction = "login" | "signup" | "reset" | "signout" | null;
type FieldErrors = Partial<Record<"name" | "email" | "phone" | "password" | "confirmPassword" | "terms", string>>;
type RegistrationIdentityCheck = {
  emailExists: boolean;
  phoneExists: boolean;
};

type TextFieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  error?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
};

function TextField({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  value,
  error,
  inputMode,
  onChange,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-brand-text">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-xl border bg-brand-surface px-4 py-3 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 ${
          error ? "border-red-300" : "border-brand-border"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  error,
  autoComplete,
  showPassword,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  autoComplete: string;
  showPassword: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-brand-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-xl border bg-brand-surface px-4 py-3 pr-11 text-brand-text outline-none transition-colors focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/15 ${
            error ? "border-red-300" : "border-brand-border"
          }`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function authCardClass() {
  return "card-premium mx-auto w-full max-w-md rounded-2xl p-5 hover:translate-y-0 sm:p-6";
}

function parseRegistrationIdentityCheck(data: unknown): RegistrationIdentityCheck {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return { emailExists: false, phoneExists: false };
  }

  const record = row as { email_exists?: unknown; phone_exists?: unknown };
  return {
    emailExists: record.email_exists === true,
    phoneExists: record.phone_exists === true,
  };
}

function duplicateRegistrationMessage({ emailExists, phoneExists }: RegistrationIdentityCheck) {
  if (emailExists && phoneExists) {
    return "Bu email və telefon nömrəsi ilə artıq qeydiyyat var. «Daxil ol» istifadə edin.";
  }
  if (phoneExists) {
    return "Bu telefon nömrəsi ilə artıq qeydiyyat var. «Daxil ol» istifadə edin.";
  }
  return "Bu email ilə artıq qeydiyyat var. «Daxil ol» istifadə edin.";
}

function shouldTryLegacyPhoneLogin(message: unknown) {
  const text = String(message ?? "").toLowerCase();
  return (
    text.includes("invalid login credentials") ||
    text.includes("phone provider") ||
    text.includes("phone login") ||
    text.includes("unsupported phone") ||
    text.includes("invalid phone") ||
    text.includes("validate phone") ||
    text.includes("phone number is invalid") ||
    text.includes("unable to validate phone") ||
    text.includes("signup requires a valid phone")
  );
}

function translateSignInError(message: string) {
  const translated = translateAuthError(message);
  if (translated === "Xəta baş verdi. Yenidən cəhd edin.") {
    return "Yanlış telefon nömrəsi və ya parol. Əvvəl «Qeydiyyat» edin.";
  }
  return translated;
}

export function ResponsiveAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnTo = sanitizeInternalPath(searchParams.get("returnTo"), "/account");
  const returnTo = resolveAuthReturnTo(rawReturnTo);
  const wantsCreateListing = isCreateListingReturnPath(rawReturnTo);
  const initialMode: AuthMode =
    searchParams.get("mode") === "register" || wantsCreateListing ? "register" : "login";
  const callbackError = searchParams.get("error") === "auth_callback";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [errorMessage, setErrorMessage] = useState(
    callbackError ? "Giriş linki etibarsızdır və ya vaxtı bitib." : "",
  );
  const [infoMessage, setInfoMessage] = useState("");

  const { supabase, user: authUser, loading: authLoading, isAuthenticated } = useAuthUser();
  const loading = loadingAction !== null;
  const isRegisterForm = mode === "register";
  const hasExistingSession = !authLoading && isAuthenticated && Boolean(authUser);
  const displayName = hasExistingSession
    ? ((authUser?.user_metadata?.display_name as string | undefined) ??
      authUser?.email?.split("@")[0] ??
      authUser?.phone ??
      "İstifadəçi")
    : null;

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className={`${authCardClass()} text-center`}>
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
    setFieldErrors({});
  };

  const updateField = (field: keyof FieldErrors, valueSetter: (value: string) => void) => {
    return (value: string) => {
      valueSetter(value);
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
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
    setLoadingAction("signout");
    await supabase.auth.signOut({ scope: "local" });
    setLoadingAction(null);
    clearMessages();
    router.refresh();
  };

  const syncProfileAfterRegistration = async (userId: string, normalizedPhone: string) => {
    const payload = {
      display_name: name.trim().replace(/\s+/g, " "),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (!error && !profile) {
      return {
        message:
          "Profil sətri tapılmadı. Supabase-də AUTH_PROFILES_PHONE_SYNC.sql migration işlədilməlidir.",
      };
    }

    if (String(error?.message ?? "").toLowerCase().includes("phone")) {
      return {
        message:
          "profiles.phone sütunu tapılmadı. Supabase-də AUTH_PROFILES_PHONE_SYNC.sql migration işlədilməlidir.",
      };
    }

    return error;
  };

  const signInWithPhoneOrLegacyEmail = async (normalizedPhone: string, rawPhone: string) => {
    const phoneResult = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password,
    });

    if (!phoneResult.error || !shouldTryLegacyPhoneLogin(phoneResult.error.message)) {
      return phoneResult;
    }

    const phoneCandidates = Array.from(new Set([normalizedPhone, rawPhone.trim()].filter(Boolean)));
    let resolvedEmail: unknown = null;

    for (const candidate of phoneCandidates) {
      const { data, error: resolveError } = await supabase.rpc("resolve_auth_email_for_phone", {
        p_phone: candidate,
      });

      if (resolveError) {
        return phoneResult;
      }

      if (typeof data === "string" && data.trim()) {
        resolvedEmail = data;
        break;
      }
    }

    if (typeof resolvedEmail !== "string" || !resolvedEmail.trim()) {
      return {
        data: { session: null, user: null },
        error: new Error("Invalid login credentials") as typeof phoneResult.error,
      };
    }

    return supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });
  };

  const handleSignIn = async () => {
    clearMessages();

    const nextErrors: FieldErrors = {};
    const phoneError = validatePhoneNumber(phone);
    if (phoneError) nextErrors.phone = phoneError;
    if (!password) nextErrors.password = "Şifrəni daxil edin.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const normalizedPhone = normalizeContactPhone(phone);
    if (!normalizedPhone) {
      setFieldErrors({ phone: CONTACT_PHONE_VALIDATION_MESSAGE });
      return;
    }

    setLoadingAction("login");
    const { data, error } = await signInWithPhoneOrLegacyEmail(normalizedPhone, phone);
    setLoadingAction(null);

    if (error) {
      setErrorMessage(translateSignInError(error.message));
      return;
    }

    if (!isAuthConfirmed(data.session?.user ?? null)) {
      await supabase.auth.signOut({ scope: "local" });
      setErrorMessage("Telefon nömrəsi təsdiqlənməyib. Təsdiq addımını tamamlayın.");
      return;
    }

    goAfterAuth();
  };

  const handleSignUp = async () => {
    clearMessages();

    const trimmedName = name.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizeContactPhone(phone);

    const nextErrors: FieldErrors = {};
    const nameError = validateFullName(trimmedName);
    const emailError = validateEmail(normalizedEmail);
    const phoneError = validatePhoneNumber(phone);
    const passwordError = validatePassword(password);

    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
    if (phoneError) nextErrors.phone = phoneError;
    if (passwordError) nextErrors.password = passwordError;
    if (password !== confirmPassword) nextErrors.confirmPassword = "Parollar uyğun gəlmir.";
    if (!termsAccepted) {
      nextErrors.terms = "İstifadəçi Razılaşması və Məxfilik Siyasəti ilə razı olmalısınız.";
    }

    if (Object.keys(nextErrors).length > 0 || !normalizedPhone) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoadingAction("signup");
    const { data: identityData, error: identityError } = await supabase.rpc("check_registration_identity", {
      p_email: normalizedEmail,
      p_phone: normalizedPhone,
    });

    if (identityError) {
      setLoadingAction(null);
      const text = String(identityError.message ?? "").toLowerCase();
      if (text.includes("check_registration_identity") || text.includes("function") || text.includes("schema cache")) {
        setErrorMessage(
          "Qeydiyyat yoxlaması aktiv deyil. Supabase-də AUTH_REGISTRATION_IDENTITY_CHECK.sql migration işlədilməlidir.",
        );
        return;
      }
      setErrorMessage("Qeydiyyat məlumatları yoxlanmadı. Yenidən cəhd edin.");
      return;
    }

    const identityCheck = parseRegistrationIdentityCheck(identityData);
    if (identityCheck.emailExists || identityCheck.phoneExists) {
      const duplicateErrors: FieldErrors = {};
      if (identityCheck.emailExists) {
        duplicateErrors.email = "Bu email ilə artıq qeydiyyat var.";
      }
      if (identityCheck.phoneExists) {
        duplicateErrors.phone = "Bu telefon nömrəsi ilə artıq qeydiyyat var.";
      }
      setLoadingAction(null);
      setFieldErrors(duplicateErrors);
      setErrorMessage(duplicateRegistrationMessage(identityCheck));
      return;
    }

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
          email: normalizedEmail,
          phone: normalizedPhone,
        },
      },
    });

    if (error) {
      setLoadingAction(null);
      setErrorMessage(translateAuthError(error.message));
      return;
    }

    if (data.session && data.user?.id) {
      const profileError = await syncProfileAfterRegistration(data.user.id, normalizedPhone);
      if (profileError) {
        setLoadingAction(null);
        setErrorMessage(`Qeydiyyat yaradıldı, amma profil yenilənmədi: ${profileError.message}`);
        return;
      }
    }

    setLoadingAction(null);

    if (data.session && isAuthConfirmed(data.session.user)) {
      goAfterAuth();
      return;
    }

    setInfoMessage(
      "Qeydiyyat yaradıldı. Email ünvanınızı təsdiqləyin, sonra telefon nömrəsi və parol ilə daxil olun.",
    );
    setPassword("");
    setConfirmPassword("");
    setMode("login");
  };

  const handleForgotPassword = async () => {
    clearMessages();

    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setFieldErrors({ email: emailError });
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
      <div className={`${authCardClass()} text-center`}>
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
            {loadingAction === "signout" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Çıxış"}
          </button>
        </div>
      </div>
    );
  }

  const cardTitle = showForgotPassword ? "Parolu bərpa et" : mode === "login" ? "Xoş gəldiniz" : "Qeydiyyat";
  const cardSubtitle = showForgotPassword
    ? "Email ünvanınıza bərpa linki göndərəcəyik"
    : mode === "login"
      ? "Telefon nömrəniz və parolunuzla daxil olun"
      : "Mobil tətbiqdəki axına uyğun hesab yaradın";

  return (
    <div className={authCardClass()}>
      <h2 className="text-xl font-extrabold text-brand-text">{cardTitle}</h2>
      <p className="mt-1 text-sm text-brand-muted">{cardSubtitle}</p>

      {wantsCreateListing && !showForgotPassword ? (
        <p className="mt-3 rounded-xl border border-brand-primary/20 bg-brand-primary-light px-3 py-2.5 text-sm font-medium text-brand-primary-dark">
          Elan yerləşdirmək üçün qeydiyyatdan keçin və ya daxil olun.
        </p>
      ) : null}

      {!showForgotPassword ? (
        <div className="mt-5 grid grid-cols-2 rounded-xl border border-brand-border bg-brand-surface p-1">
          <button
            type="button"
            className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted"
            }`}
            onClick={() => switchMode("login")}
            disabled={loading}
          >
            Daxil ol
          </button>
          <button
            type="button"
            className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
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
        onSubmit={(event) => {
          event.preventDefault();
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
          <>
            <TextField
              id="auth-name"
              label="Ad və soyad"
              placeholder="Məs: Əli Məmmədov"
              autoComplete="name"
              value={name}
              error={fieldErrors.name}
              onChange={updateField("name", setName)}
            />
            <TextField
              id="auth-email"
              label="Email"
              type="email"
              placeholder="Email ünvanınız"
              autoComplete="email"
              value={email}
              error={fieldErrors.email}
              inputMode="email"
              onChange={updateField("email", setEmail)}
            />
          </>
        ) : null}

        {showForgotPassword ? (
          <TextField
            id="auth-reset-email"
            label="Email"
            type="email"
            placeholder="Email ünvanınız"
            autoComplete="email"
            value={email}
            error={fieldErrors.email}
            inputMode="email"
            onChange={updateField("email", setEmail)}
          />
        ) : (
          <TextField
            id="auth-phone"
            label="Telefon nömrəsi"
            type="tel"
            placeholder="050 123 45 67"
            autoComplete="tel"
            value={phone}
            error={fieldErrors.phone}
            inputMode="tel"
            onChange={updateField("phone", setPhone)}
          />
        )}

        {!showForgotPassword ? (
          <>
            <PasswordField
              id="auth-password"
              label="Parol"
              placeholder={isRegisterForm ? "Ən azı 6 simvol" : "Parolunuz"}
              autoComplete={isRegisterForm ? "new-password" : "current-password"}
              value={password}
              error={fieldErrors.password}
              showPassword={showPassword}
              onChange={updateField("password", setPassword)}
              onToggle={() => setShowPassword((value) => !value)}
            />

            {isRegisterForm ? (
              <>
                <PasswordField
                  id="auth-confirm-password"
                  label="Parolu təsdiqlə"
                  placeholder="Parolu təkrarlayın"
                  autoComplete="new-password"
                  value={confirmPassword}
                  error={fieldErrors.confirmPassword}
                  showPassword={showConfirmPassword}
                  onChange={updateField("confirmPassword", setConfirmPassword)}
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                />
                <label className="flex items-start gap-3 text-sm text-brand-text">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-brand-border text-brand-primary"
                    checked={termsAccepted}
                    onChange={(event) => {
                      setTermsAccepted(event.target.checked);
                      setFieldErrors((current) => ({ ...current, terms: undefined }));
                    }}
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
                {fieldErrors.terms ? (
                  <p className="text-xs font-semibold text-red-600">{fieldErrors.terms}</p>
                ) : null}
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
              Geri - daxil ol
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
