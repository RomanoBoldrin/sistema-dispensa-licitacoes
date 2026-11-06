import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import publicationService from "@/services/publication.service";

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

  const { processId } = request.query;
  const result = await publicationService.listPublications(processId, user);

  return response.status(200).json(result);
}

async function postHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const { processId } = request.query;
  const result = await publicationService.registerPublication(
    processId,
    user,
    request.body || {},
  );

  return response.status(201).json(result);
}
