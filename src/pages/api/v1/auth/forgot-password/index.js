import crypto from "node:crypto";
import { createRouter } from "next-connect";
import { prisma } from "@/infra/prisma.cjs";
import {
  InternalServerError,
  MethodNotAllowedError,
  ValidationError,
} from "@/infra/errors";

const router = createRouter();

router.post(postHandler);

export default router.handler({
  onNoMatch: onNoMatchHandler,
  onError: onErrorHandler,
});

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  if (error.statusCode) {
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({ cause: error });
  console.error("Error inside next-connect:");
  console.error(publicErrorObject);
  response.status(500).json(publicErrorObject);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hora

async function postHandler(request, response) {
  const { email } = request.body || {};

  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ValidationError({
      message: "Informe um e-mail válido.",
      action: "Verifique o e-mail informado.",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const genericResponse = {
    message:
      "Se este e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.",
  };

  // Resposta idêntica mesmo se o e-mail não existir, para não revelar quais
  // e-mails estão cadastrados no sistema.
  if (!user) {
    return response.status(200).json(genericResponse);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const resetLink = `/reset-password?token=${token}`;

  // TODO: este projeto ainda não tem um serviço de e-mail configurado.
  // Em produção, envie `resetLink` por e-mail em vez de retorná-lo na resposta.
  console.log(
    `[forgot-password] Link de redefinição para ${user.email}: ${resetLink}`,
  );

  return response.status(200).json({
    ...genericResponse,
    resetLink, // ⚠️ apenas para desenvolvimento — remova quando integrar um serviço de e-mail
  });
}
