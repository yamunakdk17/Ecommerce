const {
  generateEsewaSignature,
  generateTransactionUuid,
} = require('../utils/paymentHelper');

const createEsewaPayment = ({
  amount,
  successUrl = process.env.ESEWA_SUCCESS_URL,
  failureUrl = process.env.ESEWA_FAILURE_URL,
}) => {
  const productCode = process.env.ESEWA_PRODUCT_CODE;

  if (!productCode) {
    throw new Error('ESEWA_PRODUCT_CODE is not configured');
  }

  if (!process.env.ESEWA_SECRET_KEY) {
    throw new Error('ESEWA_SECRET_KEY is not configured');
  }

  if (!amount || Number(amount) <= 0) {
    const error = new Error('Payment amount must be greater than 0');
    error.statusCode = 400;
    throw error;
  }

  const totalAmount = Number(amount).toFixed(2);
  const transactionUuid = generateTransactionUuid();

  const signature = generateEsewaSignature({
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
    product_code: productCode,
  });

  return {
    paymentUrl: process.env.ESEWA_PAYMENT_URL,

    formData: {
      amount: totalAmount,
      tax_amount: '0',
      product_service_charge: '0',
      product_delivery_charge: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: productCode,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    },
  };
};

module.exports = {
  createEsewaPayment,
};
