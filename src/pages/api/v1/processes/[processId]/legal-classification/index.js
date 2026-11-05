import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import legalService from "@/services/legal.service";

const router = createRouter();

router.put(putHandler);
router.patch(putHandler);

export default router.handler(controller.errorHandlers);

async function putHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const { processId } = request.query;
  const result = await legalService.updateProcessLegalClassification(
    processId,
    request.body,
    user,
  );

  return response.status(200).json(result);
}
