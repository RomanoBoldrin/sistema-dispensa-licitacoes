import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function LoginForm({ onSubmit }) {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) {
      setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
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
    if (!identifier.trim()) {
      errors.identifier = "Informe seu e-mail ou CPF.";
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
          identifier: identifier.trim(),
          password,
          rememberMe,
        });
      } else {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: identifier.trim(),
            password,
            rememberMe,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 401 || response.status === 400) {
            setGeneralError(
              data.message ||
                "Não foi possível entrar. Verifique suas credenciais.",
            );
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
        {/* Identifier Field */}
        <div>
          <label
            htmlFor="identifier"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            E-mail ou CPF
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="Seu e-mail ou CPF"
            value={identifier}
            onChange={handleIdentifierChange}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.identifier)}
            aria-describedby={
              fieldErrors.identifier ? "identifier-error" : undefined
            }
            className={`w-full rounded-lg border bg-surface px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.identifier
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
          {fieldErrors.identifier && (
            <span
              id="identifier-error"
              role="alert"
              className="mt-1 block font-label-sm text-error"
            >
              {fieldErrors.identifier}
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
            href="#recuperar-senha"
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

      {/* Divider */}
      <div className="relative my-lg flex items-center justify-center">
        <div className="w-full border-t border-outline-variant" />
        <span className="absolute bg-surface-container-lowest px-sm font-label-sm text-outline">
          ou
        </span>
      </div>

      {/* Registration CTA */}
      <div className="text-center">
        <p className="font-body-sm text-on-surface-variant">
          Não tem uma conta?{" "}
          <Link
            href="#cadastro"
            className="font-label-md font-semibold text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
