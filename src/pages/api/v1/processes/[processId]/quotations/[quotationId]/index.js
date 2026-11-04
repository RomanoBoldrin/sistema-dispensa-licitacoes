import { createRouter } from "next-connect";
import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import quotationService from "@/services/quotation.service";

const router = createRouter();

router.get(getHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

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
  const quotation = await quotationService.getQuotationById(
    request.query.processId,
    request.query.quotationId,
    user,
  );
  return response.status(200).json(quotation);
}

async function patchHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);
  const updatedQuotation = await quotationService.updateQuotation(
    request.query.processId,
    request.query.quotationId,
    request.body,
    user,
  );
  return response.status(200).json(updatedQuotation);
}

async function deleteHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);
  const result = await quotationService.deleteQuotation(
    request.query.processId,
    request.query.quotationId,
    user,
  );
  return response.status(200).json(result);
}
