import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import workflowService from "@/services/workflow.service";

const router = createRouter();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const { processId } = request.query;
  const result = await workflowService.approveStage(
    processId,
    request.body || {},
    user,
  );

  return response.status(200).json(result);
}
