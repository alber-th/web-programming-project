'use strict';

const transactionService = require('../services/transactionService');

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

exports.show = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tx = await transactionService.findByIdForUser(id, req.session.user.id);
    if (!tx) {
      req.flash('error', 'Transação não encontrada.');
      return res.redirect('/transactions');
    }
    res.render('transactions/show', {
      title: `Pedido #${tx.id} — Cloud Key`,
      transaction: tx,
    });
  } catch (err) {
    return next(err);
  }
};

exports.cancel = async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = (req.body.reason || '').trim() || null;

  try {
    await transactionService.cancelById(id, req.session.user.id, { reason });
    req.flash('success', `Pedido #${id} cancelado. Estoque devolvido.`);
    return res.redirect('/transactions');
  } catch (err) {
    if (
      err.code === 'NOT_FOUND' ||
      err.code === 'FORBIDDEN' ||
      err.name === 'InvalidTransitionError'
    ) {
      req.flash('error', err.message);
      return res.redirect('/transactions');
    }
    return next(err);
  }
};
