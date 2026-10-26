require('dotenv').config();

const app = require('./app');

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error(`Failed to start backend on port ${PORT}:`, error.message);
  process.exitCode = 1;
});
