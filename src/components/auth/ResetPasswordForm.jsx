import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ResetPasswordForm() {
  const router = useRouter();
  const token =
    typeof router.query.token === "string" ? router.query.token : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const errors = {};
    if (!password) errors.password = "Informe a nova senha.";
    else if (password.length < 8)
      errors.password = "A senha deve ter pelo menos 8 caracteres.";
    if (confirmPassword !== password)
      errors.confirmPassword = "As senhas não coincidem.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setGeneralError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setGeneralError(
          data.message || "Não foi possível redefinir sua senha.",
        );
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        "Senha redefinida com sucesso! Redirecionando para o login...",
      );
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setGeneralError("Não foi possível redefinir sua senha. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-md text-center">
        <div className="flex items-center justify-center gap-xs rounded-lg border border-error/30 bg-error-container/40 p-sm text-on-error-container font-body-sm">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-xl text-error"
          >
            error
          </span>
          <span>Link de redefinição inválido ou incompleto.</span>
        </div>
        <Link
          href="/forgot-password"
          className="font-label-md font-semibold text-primary transition-colors hover:underline"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

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

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-md flex items-center gap-xs rounded-lg border border-primary/30 bg-primary-fixed/40 p-sm text-on-primary-fixed-variant font-body-sm"
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined shrink-0 text-xl text-primary"
          >
            check_circle
          </span>
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-md">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            Nova senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password)
                setFieldErrors((p) => ({ ...p, password: undefined }));
              if (generalError) setGeneralError("");
            }}
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            Confirmar nova senha
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword)
                setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
              if (generalError) setGeneralError("");
            }}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={
              fieldErrors.confirmPassword ? "confirmPassword-error" : undefined
            }
            className={`w-full rounded-lg border bg-surface px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.confirmPassword
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
          {fieldErrors.confirmPassword && (
            <span
              id="confirmPassword-error"
              role="alert"
              className="mt-1 block font-label-sm text-error"
            >
              {fieldErrors.confirmPassword}
            </span>
          )}
        </div>

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
              <span>Salvando...</span>
            </>
          ) : (
            <span>Redefinir senha</span>
          )}
        </button>
      </form>
    </div>
  );
}
