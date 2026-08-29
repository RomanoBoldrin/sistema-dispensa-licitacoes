import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function clearFieldError(field) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (generalError) setGeneralError("");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const errors = {};
    if (!name.trim()) errors.name = "Informe seu nome completo.";
    if (!email.trim()) errors.email = "Informe seu e-mail.";
    if (!password) errors.password = "Informe uma senha.";
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
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setGeneralError(data.message || "Não foi possível criar sua conta.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        "Conta criada com sucesso! Redirecionando para o login...",
      );
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setGeneralError("Não foi possível criar sua conta. Tente novamente.");
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
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            Nome completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={`w-full rounded-lg border bg-surface px-sm py-2.5 font-body-md text-on-surface placeholder:text-outline transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-container/20 disabled:cursor-not-allowed disabled:opacity-60 ${
              fieldErrors.name
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
          {fieldErrors.name && (
            <span
              id="name-error"
              role="alert"
              className="mt-1 block font-label-sm text-error"
            >
              {fieldErrors.name}
            </span>
          )}
        </div>

        {/* Email */}
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
            placeholder="seu.email@orgao.gov.br"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
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

        {/* Password */}
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
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError("password");
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

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block font-label-md text-on-surface"
          >
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearFieldError("confirmPassword");
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
              <span>Criando conta...</span>
            </>
          ) : (
            <span>Criar conta</span>
          )}
        </button>
      </form>

      <div className="relative my-lg flex items-center justify-center">
        <div className="w-full border-t border-outline-variant" />
        <span className="absolute bg-surface-container-lowest px-sm font-label-sm text-outline">
          ou
        </span>
      </div>

      <div className="text-center">
        <p className="font-body-sm text-on-surface-variant">
          Já tem uma conta?{" "}
          <Link
            href="/register"
            className="font-label-md font-semibold text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
