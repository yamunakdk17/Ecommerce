const adminService = require('../services/adminService');

const getSettings = async (_req, res, next) => {
  try {
    const data = await adminService.getPublicStoreData();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const validatePromotion = async (req, res, next) => {
  try {
    const data = await adminService.validatePromotion(
      req.body?.code,
      req.body?.subtotal,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getSettings, validatePromotion };
