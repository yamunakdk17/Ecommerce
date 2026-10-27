const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const storefrontRoutes = require('./routes/storefrontRoutes');
const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());

// Existing product API
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storefront', storefrontRoutes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Ecommerce backend is running',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is working',
  });
});

app.get('/api/db-test', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS connected');

    res.json({
      success: true,
      message: 'MySQL database connected',
      data: rows,
    });
  } catch (error) {
    console.error('Database error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

app.use((error, req, res, next) => {
  if (!req.originalUrl.startsWith('/api')) {
    return next(error);
  }

  if (res.headersSent) {
    return next(error);
  }

  console.error('API error:', error);

  const requestedPaymentVerification =
    req.originalUrl.split('?')[0] === '/api/payments/esewa/verify';
  const requestedStatus = Number(error.statusCode || error.status);
  const statusCode =
    Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 600
      ? requestedStatus
      : 500;

  return res.status(statusCode).json({
    success: false,
    message: requestedPaymentVerification
      ? 'Payment verification failed'
      : statusCode < 500
        ? error.message
        : 'Request failed',
  });
});

module.exports = app;
