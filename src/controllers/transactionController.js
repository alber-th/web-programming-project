'use strict';

const transactionService = require('../services/transactionService');

exports.createForCurrentUser = async (req, res, next) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity) || 1;

  if (!Number.isInteger(productId) || productId <= 0) {
    req.flash('error', 'Produto inválido.');
    return res.redirect('/products');
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    req.flash('error', 'Quantidade inválida.');
    return res.redirect('/products');
  }

  try {
    await transactionService.createTransaction({
      userId: req.session.user.id,
      productId,
      quantity,
    });

    req.flash('success', 'Compra registrada com sucesso!');
    return res.redirect('/transactions');
  } catch (err) {
    if (err instanceof transactionService.ProductNotFoundError) {
      req.flash('error', 'Produto não encontrado.');
      return res.redirect('/products');
    }
    return next(err);
  }
};

exports.listForCurrentUser = async (req, res, next) => {
  try {
    const user = req.session.user;
    const isAdmin = user.role === 'ADMIN';

    const transactions = isAdmin
      ? await transactionService.listAll()
      : await transactionService.listByUser(user.id);

    res.render('transactions/index', {
      title: 'Transações — Cloud Key',
      transactions,
      isAdmin,
    });
  } catch (err) {
    return next(err);
  }
};
