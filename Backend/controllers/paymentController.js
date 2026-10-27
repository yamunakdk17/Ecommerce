const paymentService = require('../services/paymentService');
const {
verifyEsewaPayment: verifyEsewaPaymentResponse,  checkEsewaTransactionStatus,
} = require('../services/esewaService');

const initiateEsewaPayment = async (req, res, next) => {
  try {
    const { amount } = req.body || {};

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount is required',
      });
    }

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
const verifyEsewaPayment = async (req, res, next) => {
  try {
    const { data } = req.body || {};

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'eSewa response data is required',
      });
    }

    // Step 1: Verify eSewa response signature
    const verifiedPayment = verifyEsewaPayment(data);

    // Step 2: Ask eSewa for the transaction status
    const status = await checkEsewaTransactionStatus({
      transactionUuid: verifiedPayment.transactionUuid,

      totalAmount: verifiedPayment.totalAmount,
    });

    // Step 3: Check final status
    if (status.status === 'COMPLETE') {
      return res.status(200).json({
        success: true,
        paymentStatus: 'COMPLETE',
        message: 'Payment successful',
        data: {
          transactionCode: verifiedPayment.transactionCode,

          transactionUuid: verifiedPayment.transactionUuid,

          amount: verifiedPayment.totalAmount,
        },
      });
    }

    return res.status(200).json({
      success: false,
      paymentStatus: status.status || 'FAILED',
      message: 'Payment was not completed',
      data: {
        transactionUuid: verifiedPayment.transactionUuid,

        status: status.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateEsewaPayment,
  verifyEsewaPayment,
};