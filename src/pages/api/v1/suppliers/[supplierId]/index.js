import { createRouter } from "next-connect";
import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import supplierService from "@/services/supplier.service";

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
  const supplier = await supplierService.getSupplierById(
    request.query.supplierId,
    user,
  );
  return response.status(200).json(supplier);
}

async function patchHandler(request, response) {
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);
  const updatedSupplier = await supplierService.updateSupplier(
    request.query.supplierId,
    request.body,
    user,
  );
  return response.status(200).json(updatedSupplier);
}
