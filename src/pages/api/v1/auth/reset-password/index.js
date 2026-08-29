import { createRouter } from "next-connect";
import { prisma } from "@/infra/prisma.cjs";
import { hashPassword } from "@/infra/password";
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

async function postHandler(request, response) {
  const { token, password } = request.body || {};

  if (!token) {
    throw new ValidationError({
      message: "Link de redefinição inválido.",
      action: "Solicite um novo link em 'Esqueceu a senha?'.",
    });
  }

  if (!password || password.length < 8) {
    throw new ValidationError({
      message: "A senha deve ter pelo menos 8 caracteres.",
      action: "Escolha uma senha mais longa.",
    });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  const isExpired = resetToken && resetToken.expiresAt < new Date();
  const isUsed = resetToken && resetToken.usedAt !== null;

  if (!resetToken || isExpired || isUsed) {
    throw new ValidationError({
      message: "Este link de redefinição é inválido ou já expirou.",
      action: "Solicite um novo link em 'Esqueceu a senha?'.",
    });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return response
    .status(200)
    .json({ message: "Senha redefinida com sucesso." });
}
