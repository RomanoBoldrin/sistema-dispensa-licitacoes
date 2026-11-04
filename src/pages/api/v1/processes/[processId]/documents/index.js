import { createRouter } from "next-connect";
import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import documentService from "@/services/document.service";

export const config = {
  api: {
    bodyParser: false,
  },
};

const router = createRouter();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");

  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);
  const result = await documentService.listProcessDocuments(
    request.query.processId,
    user,
  );
  return response.status(200).json(result);
}

async function postHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);
  const contentType = request.headers["content-type"] || "";

  let buffer;
  let filename;
  let type;
  let declaredMimeType;

  if (contentType.includes("multipart/form-data")) {
    const webReq = new Request(
      `http://${request.headers.host || "localhost"}${request.url}`,
      {
        method: request.method,
        headers: request.headers,
        body: request,
        duplex: "half",
      },
    );

    const formData = await webReq.formData();
    const file = formData.get("file");
    type = formData.get("type");
    filename = formData.get("filename") || (file ? file.name : null);

    if (!file) {
      throw new ValidationError({
        message: "Nenhum arquivo enviado no campo 'file'.",
        action: "Selecione um arquivo válido para anexar ao processo.",
      });
    }

    declaredMimeType = file.type || undefined;
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else if (contentType.includes("application/json")) {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf-8");
    let json;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new ValidationError({
        message: "Corpo da requisição JSON inválido.",
        action: "Envie um JSON válido ou formulário multipart.",
      });
    }

    type = json.type;
    filename = json.filename;
    declaredMimeType = json.declaredMimeType || json.mimeType;

    if (json.base64Content) {
      buffer = Buffer.from(json.base64Content, "base64");
    } else if (typeof json.content === "string") {
      buffer = Buffer.from(json.content, "utf-8");
    } else {
      throw new ValidationError({
        message:
          "Conteúdo do arquivo não fornecido ('base64Content' ou 'content').",
        action: "Envie o arquivo em base64 ou via multipart/form-data.",
      });
    }
  } else {
    throw new ValidationError({
      message:
        "Content-Type deve ser 'multipart/form-data' ou 'application/json'.",
      action: "Envie a requisição no formato correto.",
    });
  }

  const uploadedDoc = await documentService.uploadProcessDocument(
    request.query.processId,
    {
      buffer,
      filename,
      type,
      declaredMimeType,
    },
    user,
  );

  return response.status(201).json(uploadedDoc);
}
