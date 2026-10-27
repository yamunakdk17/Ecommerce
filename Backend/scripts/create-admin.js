require('dotenv').config();

const crypto = require('crypto');
const { promisify } = require('util');
const db = require('../config/db');

const scrypt = promisify(crypto.scrypt);

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    throw new Error('ADMIN_EMAIL is missing from Backend/.env');
  }

  if (!password || password.length < 6) {
    throw new Error('ADMIN_PASSWORD is missing or must be at least 6 characters');
  }

  // Make sure the users table exists.
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) NOT NULL DEFAULT '',
      address VARCHAR(500) NOT NULL DEFAULT '',
      password VARCHAR(255) NULL,
      password_hash CHAR(128) NULL,
      password_salt CHAR(32) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await db.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
  `);

  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!existingColumns.has('role')) {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer'
    `);
  }

  if (!existingColumns.has('is_active')) {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE
    `);
  }

  if (!existingColumns.has('password_hash')) {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN password_hash CHAR(128) NULL
    `);
  }

  if (!existingColumns.has('password_salt')) {
    await db.query(`
      ALTER TABLE users
      ADD COLUMN password_salt CHAR(32) NULL
    `);
  }

  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);

  const [existing] = await db.query(
    `SELECT id
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  if (existing[0]) {
    await db.query(
      `UPDATE users
       SET name = ?,
           password_hash = ?,
           password_salt = ?,
           password = NULL,
           role = 'admin',
           is_active = TRUE
       WHERE id = ?`,
      [
        'Administrator',
        passwordHash.toString('hex'),
        salt.toString('hex'),
        existing[0].id,
      ],
    );

    console.log('Admin account updated successfully.');
  } else {
    await db.query(
      `INSERT INTO users
        (
          name,
          email,
          phone,
          address,
          password_hash,
          password_salt,
          role,
          is_active
        )
       VALUES (?, ?, ?, ?, ?, ?, 'admin', TRUE)`,
      [
        'Administrator',
        email,
        '',
        '',
        passwordHash.toString('hex'),
        salt.toString('hex'),
      ],
    );

    console.log('Admin account created successfully.');
  }

  console.log('');
  console.log('================================');
  console.log('ADMIN LOGIN');
  console.log('================================');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('Role:     admin');
  console.log('Status:   active');
  console.log('================================');
}

createAdmin()
  .catch((error) => {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.end();
    } catch {
      // Ignore database close errors.
    }
  });
