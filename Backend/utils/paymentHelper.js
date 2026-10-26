const crypto = require('crypto');

const generateEsewaSignature = ({ total_amount, transaction_uuid, product_code }) => {
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;

  const hmac = crypto
    .createHmac('sha256', process.env.ESEWA_SECRET_KEY)
    .update(message)
    .digest('base64');

  return hmac;
};

const generateTransactionUuid = () => {
  return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

module.exports = {
  generateEsewaSignature,
  generateTransactionUuid,
};
