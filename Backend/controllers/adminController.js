const adminService = require('../services/adminService');
const productService = require('../services/productService');

const handle = (operation, statusCode = 200) => async (req, res, next) => {
  try {
    const data = await operation(req);
    return res.status(statusCode).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const createProduct = handle(
  (req) => productService.createProduct(req.body || {}),
  201,
);
const updateProduct = handle((req) =>
  productService.updateProduct(req.params.id, req.body || {}),
);
const deleteProduct = handle((req) =>
  productService.deleteProduct(req.params.id),
);

module.exports = {
  summary: handle(() => adminService.getSummary()),
  products: handle(() => productService.getAllProducts()),
  createProduct,
  updateProduct,
  deleteProduct,
  orders: handle(() => adminService.getOrders()),
  updateOrder: handle((req) =>
    adminService.updateOrderStatus(req.params.id, req.body?.status),
  ),
  customers: handle(() => adminService.getCustomers()),
  updateCustomer: handle((req) =>
    adminService.setCustomerActive(
      req.params.id,
      req.body?.isActive,
      req.user.id,
    ),
  ),
  settings: handle(() => adminService.getSettings()),
  updateSettings: handle((req) =>
    adminService.updateSettings(req.body || {}),
  ),
  promotions: handle(() => adminService.listPromotions()),
  savePromotion: handle(
    (req) =>
      adminService.savePromotion({
        ...(req.body || {}),
        id: req.params.id || req.body?.id,
      }),
    201,
  ),
  deletePromotion: handle((req) =>
    adminService.deletePromotion(req.params.id),
  ),
};
