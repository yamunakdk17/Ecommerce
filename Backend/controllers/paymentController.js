const paymentService = require('../services/paymentService');

const {
  verifyEsewaPaymentResponse,
  checkEsewaTransactionStatus,
} = require('../services/esewaService');
const orderService = require('../services/orderService');

/*

| Initiate eSewa Payment

*/
const initiateEsewaPayment = async (req, res, next) => {
  let orderId;
  try {
    const { amount, orderId: requestedOrderId } = req.body || {};
    orderId = requestedOrderId;

    if (!amount || !orderId || !req.user) {
      return res.status(400).json({
        success: false,
        message: 'An authenticated order and payment amount are required',
      });
    }

    const payment = await paymentService.initiateEsewaPayment({
      amount,
    });

    await orderService.setEsewaTransaction(
      orderId,
      req.user.id,
      payment.formData.transaction_uuid,
      amount,
    );

    return res.status(200).json({
      success: true,
      message: 'eSewa payment initialized successfully',
      data: payment,
    });
  } catch (error) {
    if (orderId && req.user) {
      try {
        await orderService.cancelUnpaidOrder(orderId, req.user.id);
      } catch (cleanupError) {
        console.error('Unable to release stock for failed eSewa initiation:', cleanupError);
      }
    }
    next(error);
  }
};

/*
| Verify eSewa Payment

*/
const verifyEsewaPayment = async (req, res, next) => {
  try {
    const { data } = req.body || {};

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'eSewa response data is required',
      });
    }

    /*
     * STEP 1
     *
     * Send the Base64 response to the eSewa service.
     *
     * The service will:
     * - decode Base64
     * - convert it into JSON
     * - verify the eSewa signature
     * - verify the product code
     *
     * It returns verified transaction information.
     */
    const verifiedPayment = verifyEsewaPaymentResponse(data);

    /*
     * STEP 2
     *
     * Ask eSewa directly for the transaction status.
     */
    const status = await checkEsewaTransactionStatus({
      transactionUuid: verifiedPayment.transactionUuid,

      totalAmount: verifiedPayment.totalAmount,
    });

    /*
     * STEP 3
     *
     * eSewa says COMPLETE
     * = payment successful.
     */
    if (status.status === 'COMPLETE') {
      await orderService.completeEsewaOrder({
        transactionUuid: verifiedPayment.transactionUuid,
        transactionCode: status.transactionCode || verifiedPayment.transactionCode,
        totalAmount: verifiedPayment.totalAmount,
      });

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

    /*
     * STEP 4
     *
     * Payment is not COMPLETE.
     *
     * Examples:
     * PENDING
     * CANCELED
     * NOT_FOUND
     * AMBIGUOUS
     */
     if (
       status.status !== 'COMPLETE' &&
       ['CANCELED', 'CANCELLED', 'FAILED', 'NOT_FOUND'].includes(status.status)
     ) {
       await orderService.failEsewaOrder(verifiedPayment.transactionUuid);
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
