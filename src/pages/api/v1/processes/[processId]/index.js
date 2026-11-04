import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import processService from "@/services/process.service";

const router = createRouter();

router.get(getHandler);
router.patch(patchHandler);

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
  const processDetail = await processService.getProcessById(processId, user);

  return response.status(200).json(processDetail);
}

async function patchHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const { processId } = request.query;
  const updatedProcess = await processService.updateProcess(
    processId,
    request.body,
    user,
  );

  return response.status(200).json(updatedProcess);
}
