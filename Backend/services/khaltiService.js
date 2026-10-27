const generatePurchaseOrderId = (orderId) => {
  return `ORDER-${orderId}-${Date.now()}`;
};

const initiateKhaltiPayment = async ({ orderId, amount, customer, items = [] }) => {
  const secretKey = process.env.KHALTI_SECRET_KEY;

  if (!secretKey) {
    const error = new Error('KHALTI_SECRET_KEY is not configured');

    error.statusCode = 500;

    throw error;
  }

  if (!amount || Number(amount) <= 0) {
    const error = new Error('Payment amount must be greater than 0');

    error.statusCode = 400;

    throw error;
  }

  const purchaseOrderId = generatePurchaseOrderId(orderId);

  const amountInPaisa = Math.round(Number(amount) * 100);

  const productDetails = items.map((item) => ({
    identity: String(item.productId),
    name: item.name,
    total_price: Math.round(Number(item.price) * Number(item.qty) * 100),
    quantity: Number(item.qty),
    unit_price: Math.round(Number(item.price) * 100),
  }));

  const payload = {
    return_url: process.env.KHALTI_RETURN_URL,

    website_url: process.env.KHALTI_WEBSITE_URL,

    amount: amountInPaisa,

    purchase_order_id: purchaseOrderId,

    purchase_order_name: `Ecommerce Order ${orderId}`,

    customer_info: {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
    },

    product_details: productDetails,
  };

  const response = await fetch(process.env.KHALTI_PAYMENT_URL, {
    method: 'POST',

    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.pidx) {
    console.error('Khalti initiation error:', data);

    const error = new Error(
      data.detail || data.message || 'Unable to initiate Khalti payment',
    );

    error.statusCode = response.status || 502;

    throw error;
  }

  return {
    pidx: data.pidx,
    paymentUrl: data.payment_url,
    expiresAt: data.expires_at,
    expiresIn: data.expires_in,
    purchaseOrderId,
  };
};

const lookupKhaltiPayment = async ({ pidx }) => {
  const secretKey = process.env.KHALTI_SECRET_KEY;

  if (!secretKey) {
    const error = new Error('KHALTI_SECRET_KEY is not configured');

    error.statusCode = 500;

    throw error;
  }

  if (!pidx) {
    const error = new Error('Khalti pidx is required');

    error.statusCode = 400;

    throw error;
  }

  const response = await fetch(process.env.KHALTI_LOOKUP_URL, {
    method: 'POST',

    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      pidx,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Khalti lookup error:', data);

    const error = new Error(
      data.detail || data.message || 'Khalti payment lookup failed',
    );

    error.statusCode = response.status || 502;

    throw error;
  }

  return data;
};

module.exports = {
  initiateKhaltiPayment,
  lookupKhaltiPayment,
};
