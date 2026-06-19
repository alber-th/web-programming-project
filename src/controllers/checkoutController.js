'use strict';

const cartService = require('../services/cartService');
const transactionService = require('../services/transactionService');

const CARD_NUMBER_RE = /^\d{13,19}$/;
const EXPIRY_RE = /^(0[1-9]|1[0-2])\/(\d{2})$/;
const CVV_RE = /^\d{3,4}$/;

function validatePayment({ cardholderName, cardNumber, cardExpiry, cvv }) {
  const errors = {};

  if (!cardholderName || cardholderName.trim().length < 3) {
    errors.cardholderName = 'Informe o nome impresso no cartão.';
  }

  const digits = String(cardNumber || '').replace(/\D/g, '');
  if (!CARD_NUMBER_RE.test(digits)) {
    errors.cardNumber = 'Número de cartão inválido.';
  }

  if (!EXPIRY_RE.test(String(cardExpiry || '').trim())) {
    errors.cardExpiry = 'Validade deve estar no formato MM/AA.';
  } else {
    const [mm, yy] = cardExpiry.trim().split('/').map((s) => parseInt(s, 10));
    const fullYear = 2000 + yy;
    const expiryDate = new Date(fullYear, mm, 0, 23, 59, 59);
    if (expiryDate < new Date()) {
      errors.cardExpiry = 'Cartão expirado.';
    }
  }

  if (!CVV_RE.test(String(cvv || '').trim())) {
    errors.cvv = 'CVV deve ter 3 ou 4 dígitos.';
  }

  return { errors, normalizedCardDigits: digits };
}

exports.show = async (req, res, next) => {
  try {
    const cart = await cartService.getEnrichedCart(req);
    if (cart.isEmpty) {
      req.flash('error', 'Seu carrinho está vazio.');
      return res.redirect('/cart');
    }
    res.render('checkout/index', {
      title: 'Checkout — Cloud Key',
      cart,
      formData: {},
      errors: {},
    });
  } catch (err) {
    return next(err);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const cart = await cartService.getEnrichedCart(req);
    if (cart.isEmpty) {
      req.flash('error', 'Seu carrinho está vazio.');
      return res.redirect('/cart');
    }

    const { cardholderName, cardNumber, cardExpiry, cvv } = req.body;
    const formData = { cardholderName, cardNumber, cardExpiry };
    const { errors, normalizedCardDigits } = validatePayment({
      cardholderName,
      cardNumber,
      cardExpiry,
      cvv,
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).render('checkout/index', {
        title: 'Checkout — Cloud Key',
        cart,
        formData,
        errors,
      });
    }

    const cartItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const { transaction, paymentResult, paymentReason } =
      await transactionService.checkout({
        userId: req.session.user.id,
        cartItems,
        cardholderName: cardholderName.trim(),
        cardNumber: normalizedCardDigits,
        cardExpiry: cardExpiry.trim(),
        cvv,
      });

    cartService.clearCart(req);

    if (paymentResult === 'APPROVED') {
      req.flash('success', 'Pagamento aprovado! Pedido concluído.');
    } else if (paymentResult === 'DECLINED') {
      req.flash('error', `Pagamento recusado: ${paymentReason}`);
    } else {
      req.flash('error', `Falha no pagamento: ${paymentReason}`);
    }

    return res.redirect(`/transactions/${transaction.id}`);
  } catch (err) {
    if (
      err.name === 'ProductNotFoundError' ||
      err.name === 'InsufficientStockError' ||
      err.code === 'EMPTY_CART'
    ) {
      req.flash('error', err.message);
      return res.redirect('/cart');
    }
    return next(err);
  }
};
