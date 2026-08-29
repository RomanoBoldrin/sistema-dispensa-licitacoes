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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function postHandler(request, response) {
  const { name, email, password } = request.body || {};

  if (!name || !name.trim()) {
    throw new ValidationError({
      message: "Informe seu nome completo.",
      action: "Preencha o campo nome.",
    });
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ValidationError({
      message: "Informe um e-mail válido.",
      action: "Verifique o e-mail informado.",
    });
  }

  if (!password || password.length < 8) {
    throw new ValidationError({
      message: "A senha deve ter pelo menos 8 caracteres.",
      action: "Escolha uma senha mais longa.",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ValidationError({
      message: "Já existe uma conta cadastrada com este e-mail.",
      action: "Utilize outro e-mail ou faça login.",
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      // Cadastro público sempre cria usuários com o papel mais restrito.
      // Papéis administrativos devem ser promovidos manualmente por um ADMIN.
      role: "SOLICITANTE",
    },
  });

  return response.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
