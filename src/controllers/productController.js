'use strict';

const productService = require('../services/productService');

function renderCreateForm(res, { formData = {}, errors = {}, status = 200 } = {}) {
  res.status(status).render('products/new', {
    title: 'Novo produto — Cloud Key',
    formData,
    errors,
  });
}

function parsePrice(input) {
  if (input == null || input === '') return null;
  const normalized = String(input).replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseStock(input) {
  if (input == null || input === '') return 0;
  const value = Number(input);
  return Number.isInteger(value) ? value : null;
}

function validateProductInput({ name, platform, price, stock }) {
  const errors = {};

  if (!name || !name.trim()) errors.name = 'Nome é obrigatório.';
  if (!platform || !platform.trim()) errors.platform = 'Plataforma é obrigatória.';

  const parsedPrice = parsePrice(price);
  if (parsedPrice === null) {
    errors.price = 'Informe um preço válido.';
  } else if (parsedPrice <= 0) {
    errors.price = 'O preço deve ser maior que zero.';
  }

  const parsedStock = parseStock(stock);
  if (parsedStock === null) {
    errors.stock = 'Estoque deve ser um número inteiro.';
  } else if (parsedStock < 0) {
    errors.stock = 'Estoque não pode ser negativo.';
  }

  return { errors, parsedPrice, parsedStock };
}

exports.showCreateForm = (req, res) => {
  renderCreateForm(res);
};

exports.create = async (req, res, next) => {
  const { name, platform, price, stock } = req.body;
  const formData = { name, platform, price, stock };

  const { errors, parsedPrice, parsedStock } = validateProductInput({
    name,
    platform,
    price,
    stock,
  });

  if (Object.keys(errors).length > 0) {
    return renderCreateForm(res, { formData, errors, status: 400 });
  }

  try {
    await productService.createProduct({
      name: name.trim(),
      platform: platform.trim(),
      price: parsedPrice,
      stock: parsedStock,
    });

    req.flash('success', 'Produto criado com sucesso!');
    return res.redirect('/products');
  } catch (err) {
    return next(err);
  }
};

// Placeholder até a listagem ser implementada na próxima feature.
exports.index = (req, res) => {
  res.render('products/index', { title: 'Produtos — Cloud Key' });
};
