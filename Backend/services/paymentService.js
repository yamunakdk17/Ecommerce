const esewaService = require('./esewaService');

const initiateEsewaPayment = async ({ amount }) => {
  const payment = esewaService.createEsewaPayment({
    amount,
  });

  return payment;
};

module.exports = {
  initiateEsewaPayment,
};
