const orderService = require('../services/orderService');

const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user, req.body || {});
    return res.status(201).json(order);
  } catch (error) {
    return next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getUserOrders(req.user.id);
    return res.status(200).json(orders);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
};
