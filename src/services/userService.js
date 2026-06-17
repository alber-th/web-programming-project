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

module.exports = {
  findByEmail,
  registerUser,
};
