import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import finalAuthorizationService from "@/services/final-authorization.service";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const result = await finalAuthorizationService.listPendingFinalAuthorizations(
    user,
    request.query,
  );

  return response.status(200).json(result);
}
