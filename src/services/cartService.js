'use strict';

const { Product } = require('../models');

const TAX_RATE = 0.10;
const MAX_QUANTITY_PER_ITEM = 99;

function ensureCart(req) {
  if (!Array.isArray(req.session.cart)) {
    req.session.cart = [];
  }
  return req.session.cart;
}

function totalsFor(items) {
  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.unitPrice) * item.quantity,
    0
  );
  const taxes = subtotal * TAX_RATE;
  const total = subtotal + taxes;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function totalQuantity(req) {
  return ensureCart(req).reduce((acc, item) => acc + item.quantity, 0);
}

async function getEnrichedCart(req) {
  const raw = ensureCart(req);
  if (raw.length === 0) {
    return { items: [], ...totalsFor([]), itemCount: 0, isEmpty: true };
  }

  const productIds = raw.map((entry) => entry.productId);
  const products = await Product.findAll({ where: { id: productIds } });
  const productById = new Map(products.map((p) => [p.id, p]));

  const items = raw
    .map((entry) => {
      const product = productById.get(entry.productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        platform: product.platform,
        category: product.category,
        imageUrl: product.imageUrl,
        unitPrice: Number(product.price),
        availableStock: product.stock,
        quantity: entry.quantity,
        lineTotal: Number((Number(product.price) * entry.quantity).toFixed(2)),
      };
    })
    .filter(Boolean);

  return {
    items,
    ...totalsFor(items),
    itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
    isEmpty: items.length === 0,
  };
}

async function addToCart(req, productId, quantity = 1) {
  const cart = ensureCart(req);
  const product = await Product.findByPk(productId);
  if (!product) {
    const err = new Error('Produto não encontrado.');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  const existing = cart.find((entry) => entry.productId === product.id);
  const currentQty = existing ? existing.quantity : 0;
  const newQty = Math.min(currentQty + quantity, MAX_QUANTITY_PER_ITEM);

  if (newQty > product.stock) {
    const err = new Error(
      `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}.`
    );
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  if (existing) {
    existing.quantity = newQty;
  } else {
    cart.push({ productId: product.id, quantity: newQty });
  }

  return product;
}

async function updateQuantity(req, productId, quantity) {
  const cart = ensureCart(req);
  const entry = cart.find((e) => e.productId === Number(productId));
  if (!entry) {
    const err = new Error('Item não está no carrinho.');
    err.code = 'NOT_IN_CART';
    throw err;
  }

  const intQty = Number(quantity);
  if (!Number.isInteger(intQty) || intQty < 1) {
    const err = new Error('Quantidade inválida.');
    err.code = 'INVALID_QUANTITY';
    throw err;
  }

  const product = await Product.findByPk(entry.productId);
  if (!product) {
    removeFromCart(req, entry.productId);
    const err = new Error('Produto não está mais disponível.');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  if (intQty > product.stock) {
    const err = new Error(
      `Estoque insuficiente. Disponível: ${product.stock}.`
    );
    err.code = 'INSUFFICIENT_STOCK';
    throw err;
  }

  entry.quantity = Math.min(intQty, MAX_QUANTITY_PER_ITEM);
}

function removeFromCart(req, productId) {
  const cart = ensureCart(req);
  const idx = cart.findIndex((e) => e.productId === Number(productId));
  if (idx >= 0) cart.splice(idx, 1);
}

function clearCart(req) {
  req.session.cart = [];
}

module.exports = {
  TAX_RATE,
  ensureCart,
  totalQuantity,
  getEnrichedCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
};
