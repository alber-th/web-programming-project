'use strict';

const { Product } = require('../models');

async function createProduct({ name, platform, price, stock = 0 }) {
  return Product.create({ name, platform, price, stock });
}

module.exports = {
  createProduct,
};
