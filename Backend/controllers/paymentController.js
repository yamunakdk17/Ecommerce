const paymentService = require('../services/paymentService');

const initiateEsewaPayment = async (req, res, next) => {
  try {
    const { amount } = req.body;

    const payment = await paymentService.initiateEsewaPayment({
      amount,
    });

    res.status(200).json({
      success: true,
      message: 'eSewa payment initialized successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateEsewaPayment,
};
