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

// TODO: check for possible erros in this REGEX pattern.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour token

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

  // Identical answer even if the e-mail does not exist in order to not reveal
  // which e-mails are registred in the system
  if (!user) {
    return response.status(200).json(genericResponse);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  const resetLink = `/reset-password?token=${token}`;

  // TODO: this project still don't have an e-mail service configured.
  // On production, send `resetLink` via e-mail instead of returning it in the response.
  console.log(
    `[forgot-password] Link de redefinição para ${user.email}: ${resetLink}`,
  );

  return response.status(200).json({
    ...genericResponse,
    resetLink, // ⚠️ Only for development phase - remove after configuring an e-mail service.
  });
}
