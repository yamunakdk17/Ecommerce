const { promisify } = require('util');
const crypto = require('crypto');
const db = require('../config/db');

const scrypt = promisify(crypto.scrypt);
let tablesReady;

const ensureUserColumns = async () => {
  const [columns] = await db.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const existingColumns = new Map(
    columns.map((column) => [column.COLUMN_NAME, column]),
  );

  if (existingColumns.get('name')?.COLUMN_TYPE !== 'varchar(150)') {
    await db.query('ALTER TABLE users MODIFY COLUMN name VARCHAR(150) NOT NULL');
  }
  if (existingColumns.get('email')?.COLUMN_TYPE !== 'varchar(255)') {
    await db.query(
      'ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL',
    );
  }

  const requiredColumns = [
    ['phone', "VARCHAR(50) NOT NULL DEFAULT ''"],
    ['address', "VARCHAR(500) NOT NULL DEFAULT ''"],
    ['password_hash', 'CHAR(128) NULL'],
    ['password_salt', 'CHAR(32) NULL'],
    ['role', "VARCHAR(20) NOT NULL DEFAULT 'customer'"],
    ['is_active', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ];

  for (const [name, definition] of requiredColumns) {
    if (!existingColumns.has(name)) {
      await db.query(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    }
  }

  const legacyPassword = existingColumns.get('password');
  if (legacyPassword && legacyPassword.IS_NULLABLE === 'NO') {
    await db.query('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL');
  }
};

const ensureTables = () => {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(50) NOT NULL,
          address VARCHAR(500) NOT NULL DEFAULT '',
          password VARCHAR(255) NULL,
          password_hash CHAR(128) NULL,
          password_salt CHAR(32) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await ensureUserColumns();
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          token_hash CHAR(64) NOT NULL PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_sessions_user_id (user_id)
        )
      `);
    })().catch((error) => {
      tablesReady = undefined;
      throw error;
    });
  }

  return tablesReady;
};

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  address: row.address || '',
  role: row.role || 'customer',
});

const validateCredentials = ({ email, password }) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error('Enter a valid email address');
    error.statusCode = 400;
    throw error;
  }

  if (typeof password !== 'string' || password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  return normalizedEmail;
};

const createSession = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await db.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))`,
    [tokenHash, userId],
  );

  return token;
};

const register = async ({ name, email, phone, password }) => {
  await ensureTables();
  const normalizedEmail = validateCredentials({ email, password });
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const role =
    process.env.ADMIN_EMAIL?.trim().toLowerCase() === normalizedEmail
      ? 'admin'
      : 'customer';

  if (!normalizedName || !normalizedPhone) {
    const error = new Error('Name and phone number are required');
    error.statusCode = 400;
    throw error;
  }

  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);
  let result;

  try {
    [result] = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, password_salt, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        normalizedName,
        normalizedEmail,
        normalizedPhone,
        passwordHash.toString('hex'),
        salt.toString('hex'),
        role,
      ],
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicateError = new Error('This email is already registered');
      duplicateError.statusCode = 409;
      throw duplicateError;
    }
    throw error;
  }

  const user = {
    id: result.insertId,
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    address: '',
    role,
  };
  const token = await createSession(user.id);

  return { token, user };
};

const login = async ({ email, password }) => {
  await ensureTables();
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string' || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await db.query(
    `SELECT id, name, email, phone, address, password,
            password_hash, password_salt, role, is_active
     FROM users WHERE email = ? LIMIT 1`,
    [normalizedEmail],
  );
  const userRow = rows[0];

  if (!userRow) {
    const error = new Error('Wrong email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!userRow.is_active) {
    const error = new Error('This account is disabled');
    error.statusCode = 403;
    throw error;
  }

  let validPassword = false;
  if (userRow.password_hash && userRow.password_salt) {
    const passwordHash = await scrypt(
      password,
      Buffer.from(userRow.password_salt, 'hex'),
      64,
    );
    const storedHash = Buffer.from(userRow.password_hash, 'hex');
    validPassword =
      passwordHash.length === storedHash.length &&
      crypto.timingSafeEqual(passwordHash, storedHash);
  } else if (typeof userRow.password === 'string') {
    const submittedPassword = Buffer.from(password);
    const legacyPassword = Buffer.from(userRow.password);
    validPassword =
      submittedPassword.length === legacyPassword.length &&
      crypto.timingSafeEqual(submittedPassword, legacyPassword);

    if (validPassword) {
      const salt = crypto.randomBytes(16);
      const passwordHash = await scrypt(password, salt, 64);
      await db.query(
        `UPDATE users
         SET password_hash = ?, password_salt = ?, password = NULL
         WHERE id = ?`,
        [passwordHash.toString('hex'), salt.toString('hex'), userRow.id],
      );
    }
  }

  if (!validPassword) {
    const error = new Error('Wrong email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = await createSession(userRow.id);
  return { token, user: publicUser(userRow) };
};

const getUserForToken = async (token) => {
  await ensureTables();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.phone, u.address, u.role, u.is_active
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );

  if (!rows[0]) {
    const error = new Error('Session expired. Please log in again');
    error.statusCode = 401;
    throw error;
  }

  if (!rows[0].is_active) {
    const error = new Error('This account is disabled');
    error.statusCode = 403;
    throw error;
  }

  return publicUser(rows[0]);
};

const updateUser = async (userId, { name, phone, address }) => {
  await ensureTables();
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedAddress = typeof address === 'string' ? address.trim() : '';

  if (!normalizedName || !normalizedPhone) {
    const error = new Error('Name and phone number are required');
    error.statusCode = 400;
    throw error;
  }

  await db.query(
    `UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?`,
    [normalizedName, normalizedPhone, normalizedAddress, userId],
  );

  const [rows] = await db.query(
    `SELECT id, name, email, phone, address FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return publicUser(rows[0]);
};

module.exports = {
  ensureTables,
  register,
  login,
  getUserForToken,
  updateUser,
};
