'use strict';

const { Transaction, Product, User } = require('../models');

class ProductNotFoundError extends Error {
  constructor() {
    super('Produto não encontrado');
    this.name = 'ProductNotFoundError';
  }
}

async function createTransaction({ userId, productId, quantity = 1 }) {
  const product = await Product.findByPk(productId);
  if (!product) {
    throw new ProductNotFoundError();
  }

  const totalPrice = Number(product.price) * quantity;
  return Transaction.create({ userId, productId, quantity, totalPrice });
}

async function listByUser(userId) {
  return Transaction.findAll({
    where: { userId },
    include: [{ model: Product, as: 'product' }],
    order: [['createdAt', 'DESC']],
  });
}

async function listAll() {
  return Transaction.findAll({
    include: [
      { model: Product, as: 'product' },
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

module.exports = {
  createTransaction,
  listByUser,
  listAll,
  ProductNotFoundError,
};
