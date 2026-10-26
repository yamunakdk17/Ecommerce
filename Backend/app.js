const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const productRoutes = require('./routes/productRoutes');

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

module.exports = app;
