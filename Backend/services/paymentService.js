const esewaService = require('./esewaService');

const khaltiService = require('./khaltiService');

const initiateEsewaPayment = async ({ amount }) => {
  return esewaService.createEsewaPayment({
    amount,
  });
};

const initiateKhaltiPayment = async ({ orderId, amount, customer, items }) => {
  return khaltiService.initiateKhaltiPayment({
    orderId,
    amount,
    customer,
    items,
  });
};

const lookupKhaltiPayment = async ({ pidx }) => {
  return khaltiService.lookupKhaltiPayment({
    pidx,
  });
};

module.exports = {
  initiateEsewaPayment,
  initiateKhaltiPayment,
  lookupKhaltiPayment,
};
