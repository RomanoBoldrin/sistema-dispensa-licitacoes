import { createRouter } from "next-connect";
import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import documentService from "@/services/document.service";

const router = createRouter();

router.get(getHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const { document, stream } =
    await documentService.getDocumentStreamForDownload(
      request.query.processId,
      request.query.documentId,
      user,
    );

  if (request.query.meta === "true") {
    response.setHeader(
      "Cache-Control",
      "no-store, no-cache, max-age=0, must-revalidate",
    );
    return response.status(200).json(document);
  }

  response.setHeader("Content-Type", document.mimeType);
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(document.filename)}"`,
  );
  response.setHeader("Content-Length", document.size);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "private, no-cache, no-store");

  return stream.pipe(response);
}

async function deleteHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);
  const result = await documentService.deactivateDocument(
    request.query.processId,
    request.query.documentId,
    user,
  );
  return response.status(200).json(result);
}
