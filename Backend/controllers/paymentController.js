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
        console.error(
          'Unable to release stock for failed eSewa initiation:',
          cleanupError,
        );
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

    const verifiedPayment = verifyEsewaPaymentResponse(data);

    const status = await checkEsewaTransactionStatus({
      transactionUuid: verifiedPayment.transactionUuid,
      totalAmount: verifiedPayment.totalAmount,
    });

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
          transactionCode: status.transactionCode || verifiedPayment.transactionCode,

          transactionUuid: verifiedPayment.transactionUuid,

          amount: verifiedPayment.totalAmount,
        },
      });
    }

    if (['CANCELED', 'CANCELLED', 'FAILED', 'NOT_FOUND'].includes(status.status)) {
      await orderService.failEsewaOrder(verifiedPayment.transactionUuid);
    }

    return res.status(200).json({
      success: false,
      paymentStatus: status.status || 'FAILED',
      message:
        status.status === 'PENDING'
          ? 'Payment is still pending'
          : 'Payment was not completed',
      data: {
        transactionUuid: verifiedPayment.transactionUuid,

        status: status.status,
      },
    });
  } catch (error) {
    console.error('eSewa payment verification error:', error);

    next(error);
  }
};

/*

| Initiate Khalti Payment

*/
const initiateKhaltiPayment = async (req, res, next) => {
  let orderId;

  try {
    const { orderId: requestedOrderId, amount, customer, items } = req.body || {};

    orderId = requestedOrderId;

    if (!orderId || !req.user) {
      return res.status(400).json({
        success: false,
        message: 'An authenticated order is required',
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    /*
     * STEP 1
     *
     * Create Khalti payment.
     */
    const payment = await paymentService.initiateKhaltiPayment({
      orderId,
      amount,
      customer,
      items,
    });

    /*
     * STEP 2
     *
     * Save Khalti pidx against the order.
     *
     * This allows the backend to connect the
     * Khalti payment with the correct order.
     */
    await orderService.setKhaltiTransaction(orderId, req.user.id, payment.pidx, amount);

    /*
     * STEP 3
     *
     * Send payment URL back to frontend.
     */
    return res.status(200).json({
      success: true,
      message: 'Khalti payment initialized successfully',
      data: payment,
    });
  } catch (error) {
    if (orderId && req.user) {
      try {
        await orderService.cancelUnpaidOrder(orderId, req.user.id);
      } catch (cleanupError) {
        console.error(
          'Unable to release stock for failed Khalti initiation:',
          cleanupError,
        );
      }
    }

    next(error);
  }
};

/*

| Verify Khalti Payment

*/
const verifyKhaltiPayment = async (req, res, next) => {
  try {
    const { pidx } = req.body || {};

    if (!pidx) {
      return res.status(400).json({
        success: false,
        message: 'Khalti payment ID is required',
      });
    }

    /*
     * Ask Khalti directly for the payment status.
     */
    const result = await paymentService.lookupKhaltiPayment({
      pidx,
    });

    console.log('Khalti payment lookup:', result);

    /*
     * PAYMENT SUCCESS
     */
    if (result.status === 'Completed') {
      const amount = Number(result.total_amount) / 100;

      /*
       * Complete the order in MySQL.
       */
      await orderService.completeKhaltiOrder({
        pidx: result.pidx || pidx,

        transactionId: result.transaction_id || null,

        totalAmount: amount,

        purchaseOrderId: result.purchase_order_id || null,
      });

      return res.status(200).json({
        success: true,
        paymentStatus: 'COMPLETE',
        message: 'Payment successful',

        data: {
          pidx: result.pidx || pidx,

          transactionId: result.transaction_id || null,

          amount,
        },
      });
    }

    /*
     * PAYMENT FAILED / EXPIRED / CANCELED
     */
    if (['Failed', 'Expired', 'Canceled', 'Cancelled'].includes(result.status)) {
      await orderService.failKhaltiOrder(result.pidx || pidx);
    }

    /*
     * PENDING OR OTHER STATUS
     */
    return res.status(200).json({
      success: false,

      paymentStatus: result.status || 'FAILED',

      message:
        result.status === 'Pending'
          ? 'Payment is still pending'
          : 'Payment was not completed',

      data: {
        pidx: result.pidx || pidx,

        transactionId: result.transaction_id || null,

        status: result.status,
      },
    });
  } catch (error) {
    console.error('Khalti payment verification error:', error);

    next(error);
  }
};

/*

| Exports

*/
module.exports = {
  initiateEsewaPayment,
  verifyEsewaPayment,
  initiateKhaltiPayment,
  verifyKhaltiPayment,
};
