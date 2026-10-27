const crypto = require('crypto');
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
    if (typeof encodedData !== 'string' || !encodedData) {
      throw new Error('eSewa response data is missing');
    }

    const base64Data = encodedData.replace(/ /g, '+');
    const decodedString = Buffer.from(base64Data, 'base64').toString('utf8');
    const normalizedData = base64Data.replace(/=+$/, '');
    const normalizedDecoded = Buffer.from(decodedString, 'utf8')
      .toString('base64')
      .replace(/=+$/, '');

    if (
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data) ||
      normalizedData !== normalizedDecoded
    ) {
      throw new Error('Invalid Base64 response');
    }

    const data = JSON.parse(decodedString);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid eSewa response object');
    }

    return data;
  } catch {
    const err = new Error('Invalid eSewa payment response');

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

  console.log(signedFieldNames);
  const allowedFields = new Set([
    'transaction_code',
    'status',
    'total_amount',
    'transaction_uuid',
    'product_code',
  ]);
  const requiredFields = ['status', 'total_amount', 'transaction_uuid', 'product_code'];

  if (typeof signedFieldNames !== 'string' || !signedFieldNames) {
    const error = new Error('eSewa signed_field_names is missing');
    error.statusCode = 400;
    throw error;
  }

  const fields = signedFieldNames.split(',').map((field) => field.trim());

  if (
    fields.some((field) => !allowedFields.has(field)) ||
    new Set(fields).size !== fields.length ||
    requiredFields.some((field) => !fields.includes(field)) ||
    fields.some(
      (field) =>
        data[field] === undefined ||
        data[field] === null ||
        typeof data[field] === 'object',
    )
  ) {
    const error = new Error('Invalid eSewa signed fields');
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.ESEWA_SECRET_KEY) {
    throw new Error('ESEWA_SECRET_KEY is not configured');
  }

  const message = fields
    .map((field) => {
      return `${field}=${data[field]}`;
    })
    .join(',');

  return crypto
    .createHmac('sha256', process.env.ESEWA_SECRET_KEY)
    .update(message)
    .digest('base64');
};

/**
 * Verify eSewa response signature
 */
const verifyEsewaResponseSignature = (data) => {
  if (typeof data.signature !== 'string' || !data.signature) {
    return false;
  }

  const generatedSignature = generateResponseSignature(data);
  const expected = Buffer.from(generatedSignature, 'base64');
  const actual = Buffer.from(data.signature, 'base64');

  if (
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data.signature) ||
    actual.toString('base64') !== data.signature ||
    actual.length !== expected.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
};

/**
 * Verify the payment response received from eSewa
 */
const verifyEsewaPaymentResponse = (encodedData) => {
  const data = decodeEsewaResponse(encodedData);

  const isValidSignature = verifyEsewaResponseSignature(data);

  if (!isValidSignature) {
    const error = new Error('Invalid eSewa payment signature');

    error.statusCode = 400;

    throw error;
  }

  if (data.product_code !== process.env.ESEWA_PRODUCT_CODE) {
    const error = new Error('Invalid eSewa product code');

    error.statusCode = 400;

    throw error;
  }

  if (
    typeof data.transaction_uuid !== 'string' ||
    !data.transaction_uuid ||
    !Number.isFinite(Number(data.total_amount)) ||
    Number(data.total_amount) <= 0
  ) {
    const error = new Error('Invalid eSewa transaction details');
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
const checkEsewaTransactionStatus = async ({ transactionUuid, totalAmount }) => {
  if (!transactionUuid) {
    throw new Error('Transaction UUID is required');
  }

  if (!totalAmount) {
    throw new Error('Total amount is required');
  }

  const statusUrl = process.env.ESEWA_STATUS_URL;

  if (!statusUrl) {
    throw new Error('ESEWA_STATUS_URL is not configured');
  }

  const params = new URLSearchParams({
    product_code: process.env.ESEWA_PRODUCT_CODE,

    total_amount: Number(totalAmount).toFixed(2),

    transaction_uuid: transactionUuid,
  });

  const response = await fetch(`${statusUrl}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const responseText = await response.text();
  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    const error = new Error('eSewa returned an invalid transaction status response');
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data)) {
    const error = new Error('Unable to retrieve eSewa transaction status');
    error.statusCode = 502;
    throw error;
  }

  const responseUuid = data.transaction_uuid || data.pid;
  const responseAmount = data.total_amount ?? data.totalAmount;

  if (
    (responseUuid && responseUuid !== transactionUuid) ||
    (responseAmount !== undefined &&
      Number(responseAmount).toFixed(2) !== Number(totalAmount).toFixed(2))
  ) {
    const error = new Error('eSewa transaction status does not match the payment');
    error.statusCode = 400;
    throw error;
  }

  return {
    success: response.ok,

    status: data.status,

    transactionCode: data.ref_id || data.refId || data.transaction_code || null,

    transactionUuid: responseUuid || transactionUuid,

    totalAmount: responseAmount ?? totalAmount,

    rawData: data,
  };
};

module.exports = {
  createEsewaPayment,
  decodeEsewaResponse,
  verifyEsewaPaymentResponse,
  checkEsewaTransactionStatus,
};
