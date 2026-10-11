import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function LoginForm({ onSubmit }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    const errors = {};
    if (!email.trim()) {
      errors.email = "Informe seu e-mail.";
    }
    if (!password) {
      errors.password = "Informe sua senha.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setGeneralError("");
    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit({
          email: email.trim(),
          password,
          rememberMe,
        });
      } else {
        const response = await fetch("/api/v1/auth/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 403) {
            setGeneralError(
              data.message ||
                "Usuário inativo. Entre em contato com o administrador.",
            );
          } else if (response.status === 401 || response.status === 400) {
            setGeneralError(data.message || "E-mail ou senha inválidos.");
          } else {
            setGeneralError(
              "Não foi possível realizar o login. Tente novamente.",
            );
          }
          setIsLoading(false);
          return;
        }

        router.push("/dashboard");
      }
    } catch {
      setGeneralError("Não foi possível realizar o login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {generalError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-md flex items-center gap-xs rounded-lg border border-error/30 bg-error-container/40 p-sm text-on-error-container font-body-sm"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined shrink-0 text-xl text-error"
          >
            error
          </span>
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-md">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={handleEmailChange}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={`w-full rounded-lg border bg-surface px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.email
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
          {fieldErrors.email && (
            <span
              id="email-error"
              role="alert"
              className="mt-1 block font-label-sm text-error"
            >
              {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={handlePasswordChange}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            className={`w-full rounded-lg border bg-surface px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.password
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
          {fieldErrors.password && (
            <span
              id="password-error"
              role="alert"
              className="mt-1 block font-label-sm text-error"
            >
              {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Remember Me and Forgot Password */}
        <div className="flex flex-wrap items-center justify-between gap-xs pt-1">
          <label className="flex cursor-pointer items-center gap-xs select-none">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-outline-variant text-primary accent-primary focus:ring-primary focus:ring-offset-0 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="font-label-sm text-on-surface-variant hover:text-on-surface">
              Lembrar de mim
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="font-label-sm text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Esqueceu a senha?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary-container py-2.5 px-sm font-label-md text-on-primary transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span
                aria-hidden="true"
                className="material-symbols-outlined animate-spin text-base"
              >
                progress_activity
              </span>
              <span>Entrando...</span>
            </>
          ) : (
            <span>Entrar</span>
          )}
        </button>
      </form>

      {/* Info: provisioned users only */}
      <p className="mt-sm text-center font-body-sm text-on-surface-variant">
        Acesso restrito a usuários cadastrados pelo administrador.
      </p>
    </div>
  );
}
