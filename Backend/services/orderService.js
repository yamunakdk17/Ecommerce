const db = require('../config/db');

let tablesReady;

const ensureOrderColumns = async () => {
  const [columns] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`,
  );
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));
  const missing = [
    ['customer_address', 'VARCHAR(500) NULL'],
    ['total', 'DECIMAL(12, 2) NULL'],
    ['discount_amount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0'],
    ['promo_code', 'VARCHAR(50) NULL'],
    ['transaction_uuid', 'VARCHAR(100) NULL'],
    ['transaction_code', 'VARCHAR(100) NULL'],
    ['khalti_pidx', 'VARCHAR(100) NULL UNIQUE'],
    ['khalti_transaction_id', 'VARCHAR(150) NULL'],
    [
      'updated_at',
      'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ],
  ];

  for (const [name, definition] of missing) {
    if (!existing.has(name)) {
      await db.query(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
    }
  }

  if (!existing.has('customer_email')) {
    await db.query(
      "ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255) NOT NULL DEFAULT ''",
    );
  }
  await db.query('UPDATE orders SET total = total_amount WHERE total IS NULL');
  if (existing.has('address')) {
    await db.query(
      'UPDATE orders SET customer_address = address WHERE customer_address IS NULL',
    );
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL,
      CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      transaction_uuid VARCHAR(255) NULL UNIQUE,
      transaction_code VARCHAR(255) NULL,
      khalti_pidx VARCHAR(100) NULL UNIQUE,
      khalti_transaction_id VARCHAR(150) NULL,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      status VARCHAR(50) NULL DEFAULT 'PENDING',
      raw_response TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
};

const ensureTables = () => {
  if (!tablesReady) {
    tablesReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          customer_name VARCHAR(150) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(50) NOT NULL,
          address VARCHAR(500) NULL,
          customer_address VARCHAR(500) NOT NULL,
          total_amount DECIMAL(12, 2) NOT NULL,
          total DECIMAL(12, 2) NOT NULL,
          discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          promo_code VARCHAR(50) NULL,
          payment_method VARCHAR(20) NOT NULL,
          payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
          order_status VARCHAR(30) NOT NULL DEFAULT 'pending',
          transaction_uuid VARCHAR(100) NULL UNIQUE,
          transaction_code VARCHAR(100) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP
        )
      `)
      .then(ensureOrderColumns)
      .then(() =>
        db.query(`
          CREATE TABLE IF NOT EXISTS promotions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            description VARCHAR(255) NOT NULL,
            discount_percent DECIMAL(5, 2) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            starts_at DATETIME NULL,
            ends_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `),
      )
      .catch((error) => {
        tablesReady = undefined;
        throw error;
      });
  }

  return tablesReady;
};

const normalizeOrder = (order) => ({
  ...order,
  total: Number(order.total),
  discountAmount: Number(order.discountAmount || 0),
});

const attachItems = async (orders) => {
  if (!orders.length) return [];
  const ids = orders.map((order) => order.id);
  const [rows] = await db.query(
    `SELECT order_id AS orderId, product_id AS productId,
            product_name AS name, price, quantity AS qty, subtotal
     FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')})
     ORDER BY id`,
    ids,
  );
  const itemsByOrder = new Map();
  rows.forEach((item) => {
    const items = itemsByOrder.get(item.orderId) || [];
    items.push({
      ...item,
      price: Number(item.price),
      subtotal: Number(item.subtotal),
    });
    itemsByOrder.set(item.orderId, items);
  });
  return orders.map((order) => ({
    ...normalizeOrder(order),
    items: itemsByOrder.get(order.id) || [],
  }));
};

const createOrder = async (
  user,
  { customer, items, paymentMethod = 'COD', promoCode },
) => {
  await ensureTables();

  if (!customer || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Customer details and at least one item are required');
    error.statusCode = 400;
    throw error;
  }

const method = String(paymentMethod).toUpperCase();

if (!['COD', 'ESEWA', 'KHALTI'].includes(method)) {
  const error = new Error('Unsupported payment method');
  error.statusCode = 400;
  throw error;
}

  const customerName =
    typeof customer.name === 'string' ? customer.name.trim() : '';
  const customerPhone =
    typeof customer.phone === 'string' ? customer.phone.trim() : '';
  const customerAddress =
    typeof customer.address === 'string' ? customer.address.trim() : '';

  if (!customerName || !customerPhone || !customerAddress) {
    const error = new Error('Name, phone number, and address are required');
    error.statusCode = 400;
    throw error;
  }

  const quantities = new Map();
  for (const item of items) {
    const id = Number(item.id);
    const qty = Number(item.qty);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(qty) || qty < 1) {
      const error = new Error('Invalid item or quantity in order');
      error.statusCode = 400;
      throw error;
    }
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const orderItems = [];

    for (const [productId, qty] of quantities) {
      const [products] = await connection.query(
        `SELECT id, name, image, price, stock
         FROM products WHERE id = ? FOR UPDATE`,
        [productId],
      );
      const product = products[0];
      if (!product) {
        const error = new Error('A product in your cart is no longer available');
        error.statusCode = 409;
        throw error;
      }
      if (Number(product.stock) < qty) {
        const error = new Error(`${product.name} does not have enough stock`);
        error.statusCode = 409;
        throw error;
      }

      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [qty, productId],
      );
      orderItems.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        price: Number(product.price),
        qty,
      });
    }

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    let discountAmount = 0;
    let normalizedPromoCode = null;
    if (promoCode) {
      normalizedPromoCode = String(promoCode).trim().toUpperCase();
      const [promotions] = await connection.query(
        `SELECT discount_percent FROM promotions
         WHERE code = ? AND is_active = TRUE
           AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP())
           AND (ends_at IS NULL OR ends_at >= UTC_TIMESTAMP())
         LIMIT 1`,
        [normalizedPromoCode],
      );
      if (!promotions[0]) {
        const error = new Error('This promotion code is invalid or expired');
        error.statusCode = 400;
        throw error;
      }
      discountAmount =
        Math.round(
          (subtotal * Number(promotions[0].discount_percent) / 100 +
            Number.EPSILON) *
            100,
        ) / 100;
    }
    const total = Math.max(0, subtotal - discountAmount);
    const [result] = await connection.query(
      `INSERT INTO orders
        (user_id, customer_name, customer_email, customer_phone, address,
         customer_address, total_amount, total, discount_amount, promo_code,
         payment_method, payment_status, order_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        customerName,
        user.email,
        customerPhone,
        customerAddress,
        customerAddress,
        total.toFixed(2),
        total.toFixed(2),
        discountAmount.toFixed(2),
        normalizedPromoCode,
        method,
        method === 'COD' ? 'unpaid' : 'pending',
        method === 'COD' ? 'pending' : 'awaiting_payment',
      ],
    );

    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name, price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          item.productId,
          item.name,
          item.price.toFixed(2),
          item.qty,
          (item.price * item.qty).toFixed(2),
        ],
      );
    }

    await connection.commit();
    return {
      orderId: result.insertId,
      total,
      discountAmount,
      items: orderItems,
      status: method === 'COD' ? 'pending' : 'awaiting_payment',
      paymentStatus: method === 'COD' ? 'unpaid' : 'pending',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getUserOrders = async (userId) => {
  await ensureTables();
  const [orders] = await db.query(
    `SELECT id, customer_name AS customerName, customer_phone AS customerPhone,
            COALESCE(customer_address, address) AS customerAddress, total,
            discount_amount AS discountAmount,
            payment_method AS paymentMethod, payment_status AS paymentStatus,
            order_status AS status, transaction_uuid AS transactionUuid,
            transaction_code AS transactionCode, created_at AS createdAt
     FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );
  return attachItems(orders);
};

const setEsewaTransaction = async (
  orderId,
  userId,
  transactionUuid,
  totalAmount,
) => {
  await ensureTables();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id, total FROM orders
       WHERE id = ? AND user_id = ? AND payment_method = 'ESEWA'
         AND order_status = 'awaiting_payment' AND total = ?
       FOR UPDATE`,
      [orderId, userId, Number(totalAmount).toFixed(2)],
    );
    if (!orders[0]) {
      const error = new Error('Order cannot accept an eSewa transaction');
      error.statusCode = 409;
      throw error;
    }
    await connection.query(
      'UPDATE orders SET transaction_uuid = ? WHERE id = ?',
      [transactionUuid, orderId],
    );
    await connection.query(
      `INSERT INTO payments
        (order_id, transaction_uuid, amount, payment_method, status)
       VALUES (?, ?, ?, 'ESEWA', 'PENDING')`,
      [orderId, transactionUuid, Number(totalAmount).toFixed(2)],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const cancelUnpaidOrder = async (orderId, userId) => {
  await ensureTables();

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT id
       FROM orders
       WHERE id = ?
         AND user_id = ?
         AND payment_method IN ('ESEWA', 'KHALTI')
         AND payment_status = 'pending'
         AND order_status = 'awaiting_payment'
         AND transaction_uuid IS NULL
         AND khalti_pidx IS NULL
       FOR UPDATE`,
      [orderId, userId],
    );

    if (!orders[0]) {
      await connection.rollback();
      return;
    }

    const [items] = await connection.query(
      `SELECT product_id AS productId, quantity AS qty
       FROM order_items
       WHERE order_id = ?`,
      [orderId],
    );

    // Restore product stock
    for (const item of items) {
      await connection.query(
        `UPDATE products
         SET stock = stock + ?
         WHERE id = ?`,
        [item.qty, item.productId],
      );
    }

    // Cancel order
    await connection.query(
      `UPDATE orders
       SET order_status = 'cancelled',
           payment_status = 'failed'
       WHERE id = ?`,
      [orderId],
    );

    // Mark payment as failed
    await connection.query(
      `UPDATE payments
       SET status = 'FAILED'
       WHERE order_id = ?`,
      [orderId],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const failEsewaOrder = async (transactionUuid) => {
  await ensureTables();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id FROM orders
       WHERE transaction_uuid = ? AND payment_method = 'ESEWA'
         AND payment_status = 'pending' AND order_status = 'awaiting_payment'
       FOR UPDATE`,
      [transactionUuid],
    );
    if (!orders[0]) {
      await connection.rollback();
      return;
    }

    const [items] = await connection.query(
      'SELECT product_id AS productId, quantity AS qty FROM order_items WHERE order_id = ?',
      [orders[0].id],
    );
    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.qty, item.productId],
      );
    }
    await connection.query(
      `UPDATE orders SET order_status = 'cancelled', payment_status = 'failed'
       WHERE id = ?`,
      [orders[0].id],
    );
    await connection.query(
      "UPDATE payments SET status = 'FAILED' WHERE order_id = ?",
      [orders[0].id],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const completeEsewaOrder = async ({ transactionUuid, transactionCode, totalAmount }) => {
  await ensureTables();

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT id
       FROM orders
       WHERE transaction_uuid = ?
         AND payment_method = 'ESEWA'
       FOR UPDATE`,
      [transactionUuid],
    );

    if (!orders[0]) {
      const error = new Error('No matching eSewa order was found');
      error.statusCode = 409;
      throw error;
    }

    const orderId = orders[0].id;

    const [result] = await connection.query(
      `UPDATE orders
       SET
         payment_status = 'paid',
         order_status = 'pending',
         transaction_code = ?
       WHERE id = ?`,
      [transactionCode || null, orderId],
    );

    if (!result.affectedRows) {
      const error = new Error('Unable to complete eSewa order');
      error.statusCode = 409;
      throw error;
    }

    await connection.query(
      `UPDATE payments
       SET
         status = 'COMPLETE',
         transaction_code = ?
       WHERE order_id = ?
         AND transaction_uuid = ?`,
      [transactionCode || null, orderId, transactionUuid],
    );

    await connection.commit();

    return {
      orderId,
      transactionUuid,
      transactionCode: transactionCode || null,
      totalAmount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
const setKhaltiTransaction = async (orderId, userId, pidx, totalAmount) => {
  await ensureTables();

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT id, total
       FROM orders
       WHERE id = ?
         AND user_id = ?
         AND payment_method = 'KHALTI'
         AND order_status = 'awaiting_payment'
         AND payment_status = 'pending'
         AND total = ?
       FOR UPDATE`,
      [orderId, userId, Number(totalAmount).toFixed(2)],
    );

    if (!orders[0]) {
      const error = new Error('Order cannot accept a Khalti transaction');
      error.statusCode = 409;
      throw error;
    }

    await connection.query(
      `UPDATE orders
       SET khalti_pidx = ?
       WHERE id = ?`,
      [pidx, orderId],
    );

    await connection.query(
      `INSERT INTO payments
        (
          order_id,
          khalti_pidx,
          amount,
          payment_method,
          status
        )
       VALUES (?, ?, ?, 'KHALTI', 'PENDING')
       ON DUPLICATE KEY UPDATE
         khalti_pidx = VALUES(khalti_pidx),
         amount = VALUES(amount),
         payment_method = 'KHALTI',
         status = 'PENDING'`,
      [orderId, pidx, Number(totalAmount).toFixed(2)],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const completeKhaltiOrder = async ({ pidx, transactionId, totalAmount }) => {
  await ensureTables();

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT id
       FROM orders
       WHERE khalti_pidx = ?
         AND total = ?
         AND payment_method = 'KHALTI'
         AND payment_status = 'pending'
         AND order_status = 'awaiting_payment'
       FOR UPDATE`,
      [pidx, Number(totalAmount).toFixed(2)],
    );

    if (!orders[0]) {
      const error = new Error('No matching pending Khalti order was found');
      error.statusCode = 409;
      throw error;
    }

    const orderId = orders[0].id;

    await connection.query(
      `UPDATE orders
       SET
         payment_status = 'paid',
         order_status = 'pending',
         khalti_transaction_id = ?
       WHERE id = ?`,
      [transactionId || null, orderId],
    );

    await connection.query(
      `UPDATE payments
       SET
         status = 'COMPLETE',
         khalti_transaction_id = ?
       WHERE order_id = ?
         AND khalti_pidx = ?`,
      [transactionId || null, orderId, pidx],
    );

    await connection.commit();

    return {
      orderId,
      pidx,
      transactionId: transactionId || null,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const failKhaltiOrder = async (pidx) => {
  await ensureTables();

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT id
       FROM orders
       WHERE khalti_pidx = ?
         AND payment_method = 'KHALTI'
         AND payment_status = 'pending'
         AND order_status = 'awaiting_payment'
       FOR UPDATE`,
      [pidx],
    );

    if (!orders[0]) {
      await connection.rollback();
      return;
    }

    const orderId = orders[0].id;

    const [items] = await connection.query(
      `SELECT product_id AS productId,
              quantity AS qty
       FROM order_items
       WHERE order_id = ?`,
      [orderId],
    );

    for (const item of items) {
      await connection.query(
        `UPDATE products
         SET stock = stock + ?
         WHERE id = ?`,
        [item.qty, item.productId],
      );
    }

    await connection.query(
      `UPDATE orders
       SET
         order_status = 'cancelled',
         payment_status = 'failed'
       WHERE id = ?`,
      [orderId],
    );

    await connection.query(
      `UPDATE payments
       SET status = 'FAILED'
       WHERE order_id = ?
         AND khalti_pidx = ?`,
      [orderId, pidx],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  ensureTables,
  attachItems,
  createOrder,
  getUserOrders,
  setEsewaTransaction,
  cancelUnpaidOrder,
  failEsewaOrder,
  completeEsewaOrder,
  setKhaltiTransaction,
  completeKhaltiOrder,
  failKhaltiOrder,
};

