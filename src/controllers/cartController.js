'use strict';

const cartService = require('../services/cartService');

function flashError(req, err, fallback) {
  req.flash('error', err && err.message ? err.message : fallback);
}

exports.show = async (req, res, next) => {
  try {
    const cart = await cartService.getEnrichedCart(req);
    res.render('cart/index', {
      title: 'Carrinho — Cloud Key',
      cart,
    });
  } catch (err) {
    return next(err);
  }
};

exports.add = async (req, res, next) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity) || 1;

  if (!Number.isInteger(productId) || productId <= 0) {
    req.flash('error', 'Produto inválido.');
    return res.redirect(req.get('Referrer') || '/products');
  }

  try {
    const product = await cartService.addToCart(req, productId, quantity);
    req.flash('success', `"${product.name}" adicionado ao carrinho.`);
    return res.redirect(req.get('Referrer') || '/cart');
  } catch (err) {
    if (
      err.code === 'PRODUCT_NOT_FOUND' ||
      err.code === 'INSUFFICIENT_STOCK'
    ) {
      flashError(req, err, 'Não foi possível adicionar ao carrinho.');
      return res.redirect(req.get('Referrer') || '/products');
    }
    return next(err);
  }
};

exports.updateQuantity = async (req, res, next) => {
  try {
    await cartService.updateQuantity(req, req.body.productId, req.body.quantity);
    return res.redirect('/cart');
  } catch (err) {
    if (
      err.code === 'INVALID_QUANTITY' ||
      err.code === 'INSUFFICIENT_STOCK' ||
      err.code === 'NOT_IN_CART' ||
      err.code === 'PRODUCT_NOT_FOUND'
    ) {
      flashError(req, err, 'Não foi possível atualizar o item.');
      return res.redirect('/cart');
    }
    return next(err);
  }
};

exports.remove = (req, res) => {
  cartService.removeFromCart(req, req.body.productId);
  req.flash('success', 'Item removido do carrinho.');
  return res.redirect('/cart');
};

exports.clear = (req, res) => {
  cartService.clearCart(req);
  req.flash('success', 'Carrinho esvaziado.');
  return res.redirect('/cart');
};
