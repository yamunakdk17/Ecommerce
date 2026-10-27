const crypto = require("crypto");
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
/**
 * Decode eSewa Base64 response
 */
const decodeEsewaResponse = (encodedData) => {
  try {
    if (!encodedData) {
      throw new Error("eSewa response data is missing");
    }

    const decodedString = Buffer.from(
      encodedData,
      "base64"
    ).toString("utf8");

    const data = JSON.parse(decodedString);

    return data;
  } catch (error) {
    const err = new Error(
      "Invalid eSewa payment response"
    );

    err.statusCode = 400;

    throw err;
  }
};


/**
 * Generate signature for eSewa response verification
 *
 * eSewa response contains:
 *
 * transaction_code
 * status
 * total_amount
 * transaction_uuid
 * product_code
 * signed_field_names
 */
const generateResponseSignature = (data) => {
  const signedFieldNames = data.signed_field_names;

  if (!signedFieldNames) {
    throw new Error(
      "eSewa signed_field_names is missing"
    );
  }

  const fields = signedFieldNames.split(",");

  const message = fields
    .map((field) => {
      return `${field}=${data[field]}`;
    })
    .join(",");

  return crypto
    .createHmac(
      "sha256",
      process.env.ESEWA_SECRET_KEY
    )
    .update(message)
    .digest("base64");
};


/**
 * Verify eSewa response signature
 */
const verifyEsewaResponseSignature = (data) => {
  if (!data.signature) {
    return false;
  }

  const generatedSignature =
    generateResponseSignature(data);

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(data.signature)
  );
};


/**
 * Verify the payment response received from eSewa
 */
const verifyEsewaPayment = (encodedData) => {
  const data = decodeEsewaResponse(encodedData);

  const isValidSignature =
    verifyEsewaResponseSignature(data);

  if (!isValidSignature) {
    const error = new Error(
      "Invalid eSewa payment signature"
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    data.product_code !==
    process.env.ESEWA_PRODUCT_CODE
  ) {
    const error = new Error(
      "Invalid eSewa product code"
    );

    error.statusCode = 400;

    throw error;
  }

  return {
    verified: true,

    status: data.status,

    transactionCode: data.transaction_code,

    transactionUuid: data.transaction_uuid,

    productCode: data.product_code,

    totalAmount: data.total_amount,

    rawData: data,
  };
};


/**
 * Check transaction status directly with eSewa
 */
const checkEsewaTransactionStatus = async ({
  transactionUuid,
  totalAmount,
}) => {
  if (!transactionUuid) {
    throw new Error(
      "Transaction UUID is required"
    );
  }

  if (!totalAmount) {
    throw new Error(
      "Total amount is required"
    );
  }

  const statusUrl =
    process.env.ESEWA_STATUS_URL;

  if (!statusUrl) {
    throw new Error(
      "ESEWA_STATUS_URL is not configured"
    );
  }

  const params = new URLSearchParams({
    product_code:
      process.env.ESEWA_PRODUCT_CODE,

    total_amount: Number(totalAmount).toFixed(2),

    transaction_uuid: transactionUuid,
  });

  const response = await fetch(
    `${statusUrl}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await response.json();

  return {
    success: response.ok,

    status: data.status,

    transactionCode:
      data.refId || null,

    transactionUuid:
      data.pid || transactionUuid,

    totalAmount:
      data.totalAmount || totalAmount,

    rawData: data,
  };
};


module.exports = {
  createEsewaPayment,
  decodeEsewaResponse,
  verifyEsewaPayment,
  checkEsewaTransactionStatus,
};