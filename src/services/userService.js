'use strict';

const bcrypt = require('bcrypt');
const { User } = require('../models');

const SALT_ROUNDS = 10;

async function findByEmail(email) {
  return User.findOne({ where: { email } });
}

async function registerUser({ name, email, password, role = 'CLIENTE' }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return User.create({ name, email, passwordHash, role });
}

async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user) return null;
  const matches = await bcrypt.compare(password, user.passwordHash);
  return matches ? user : null;
}

module.exports = {
  findByEmail,
  registerUser,
  verifyCredentials,
};
