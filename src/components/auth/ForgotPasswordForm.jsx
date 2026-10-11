import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devResetLink, setDevResetLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email.trim()) {
      setFieldError("Informe seu e-mail.");
      return;
    }

    setFieldError("");
    setGeneralError("");
    setSuccessMessage("");
    setDevResetLink("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setGeneralError(
          data.message || "Não foi possível processar sua solicitação.",
        );
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message);
      // ⚠️ Apenas para desenvolvimento: sem um serviço de e-mail configurado, a API
      // devolve o link de redefinição na resposta. Remova este bloco quando integrar
      // um provedor de e-mail real.
      if (data.resetLink) setDevResetLink(data.resetLink);
    } catch {
      setGeneralError(
        "Não foi possível processar sua solicitação. Tente novamente.",
      );
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

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-md space-y-1 rounded-lg border border-primary/30 bg-primary-fixed/40 p-sm text-on-primary-fixed-variant font-body-sm"
        >
          <div className="flex items-center gap-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined shrink-0 text-xl text-primary"
            >
              mark_email_read
            </span>
            <span>{successMessage}</span>
          </div>

          {devResetLink && (
            <p className="pl-7 text-[11px] text-on-surface-variant">
              Modo desenvolvimento (sem e-mail configurado):{" "}
              <Link
                href={devResetLink}
                className="font-semibold text-primary hover:underline"
              >
                abrir link de redefinição
              </Link>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-md">
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
            placeholder="Seu e-mail cadastrado"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError("");
              if (generalError) setGeneralError("");
            }}
            disabled={isLoading}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "email-error" : undefined}
            className={`w-full rounded-lg border bg-surface px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldError
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
          {fieldError && (
            <span
              id="email-error"
              role="alert"
              className="mt-1 block font-label-sm text-error"
            >
              {fieldError}
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
              <span>Enviando...</span>
            </>
          ) : (
            <span>Enviar link de redefinição</span>
          )}
        </button>
      </form>

      <div className="mt-lg text-center">
        <Link
          href="/login"
          className="font-label-md font-semibold text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
