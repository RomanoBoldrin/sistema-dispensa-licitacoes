import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import workflowService from "@/services/workflow.service";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const result = await workflowService.listApprovalInbox(user, request.query);

  return response.status(200).json(result);
}
