'use strict';

const { Product } = require('../models');

async function createProduct({ name, platform, price, stock = 0, imageUrl = null, category = null }) {
  return Product.create({ name, platform, price, stock, imageUrl, category });
}

async function listProducts() {
  return Product.findAll({ order: [['createdAt', 'DESC']] });
}

async function findProductById(id) {
  return Product.findByPk(id);
}

async function updateProduct(id, { name, platform, price, stock, imageUrl, category }) {
  const product = await Product.findByPk(id);
  if (!product) return null;
  await product.update({ name, platform, price, stock, imageUrl, category });
  return product;
}

async function deleteProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) return false;
  await product.destroy();
  return true;
}

module.exports = {
  createProduct,
  listProducts,
  findProductById,
  updateProduct,
  deleteProduct,
};
