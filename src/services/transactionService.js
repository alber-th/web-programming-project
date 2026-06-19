'use strict';

const { Transaction, TransactionItem, Product, User, sequelize } = require('../models');
const paymentService = require('./paymentService');

class ProductNotFoundError extends Error {
  constructor() {
    super('Produto não encontrado');
    this.name = 'ProductNotFoundError';
  }
}

class InsufficientStockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

class InvalidTransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

const TAX_RATE = 0.10;

function calculateTotals(items) {
  const subtotal = items.reduce((acc, it) => acc + Number(it.unitPrice) * it.quantity, 0);
  const taxes = subtotal * TAX_RATE;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    total: Number((subtotal + taxes).toFixed(2)),
  };
}

/**
 * Cria um pedido a partir do carrinho do usuário e processa o pagamento simulado.
 * Tudo em uma única transação de banco para garantir atomicidade:
 *  - Re-checa estoque por item;
 *  - Cria a Transaction com status PROCESSING;
 *  - Cria TransactionItems;
 *  - Decrementa o estoque dos produtos.
 *
 * Em seguida, fora da transação SQL, chama o gateway simulado.
 * Conforme o resultado, atualiza o status:
 *  - APPROVED        -> COMPLETED
 *  - DECLINED        -> FAILED (estoque restaurado)
 *  - NETWORK_ERROR   -> FAILED (estoque restaurado)
 */
async function checkout({ userId, cartItems, cardholderName, cardNumber, cardExpiry, cvv }) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    const err = new Error('Carrinho vazio.');
    err.code = 'EMPTY_CART';
    throw err;
  }

  // Re-busca produtos para preço atual (não confiar nos preços do session).
  const productIds = cartItems.map((it) => it.productId);
  const products = await Product.findAll({ where: { id: productIds } });
  const productById = new Map(products.map((p) => [p.id, p]));

  const enrichedItems = cartItems.map((entry) => {
    const product = productById.get(entry.productId);
    if (!product) throw new ProductNotFoundError();
    if (entry.quantity > product.stock) {
      throw new InsufficientStockError(
        `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}.`
      );
    }
    return {
      productId: product.id,
      quantity: entry.quantity,
      unitPrice: Number(product.price),
      product,
    };
  });

  const totals = calculateTotals(enrichedItems);
  const cardLastFour = String(cardNumber || '').replace(/\D/g, '').slice(-4);

  // === Atomicidade: cria transação + itens + decremento de estoque ===
  const transaction = await sequelize.transaction(async (t) => {
    const tx = await Transaction.create(
      {
        userId,
        subtotal: totals.subtotal,
        taxes: totals.taxes,
        totalPrice: totals.total,
        status: 'PROCESSING',
        cardholderName,
        cardLastFour,
        processingStartedAt: new Date(),
        // legacy: primeiro item espelhado em productId/quantity para compat com listagens antigas.
        productId: enrichedItems[0].productId,
        quantity: enrichedItems[0].quantity,
      },
      { transaction: t }
    );

    await TransactionItem.bulkCreate(
      enrichedItems.map((it) => ({
        transactionId: tx.id,
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
      { transaction: t }
    );

    // Decremento atômico — recarrega cada produto com lock pessimista de linha.
    for (const it of enrichedItems) {
      const locked = await Product.findByPk(it.product.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!locked || locked.stock < it.quantity) {
        throw new InsufficientStockError(
          `Estoque insuficiente para "${it.product.name}".`
        );
      }
      await locked.decrement('stock', { by: it.quantity, transaction: t });
    }

    return tx;
  });

  // === Fora da transação SQL: chama o "gateway" simulado ===
  const auth = await paymentService.authorize({
    cardholderName,
    cardNumber,
    expiry: cardExpiry,
    cvv,
  });

  if (auth.result === 'APPROVED') {
    await transaction.update({
      status: 'COMPLETED',
      completedAt: auth.authorizedAt,
    });
  } else {
    // DECLINED ou NETWORK_ERROR: marca como FAILED e devolve estoque atomicamente.
    await sequelize.transaction(async (t) => {
      await transaction.update(
        {
          status: 'FAILED',
          cancellationReason: auth.reason,
        },
        { transaction: t }
      );
      for (const it of enrichedItems) {
        await Product.increment('stock', {
          by: it.quantity,
          where: { id: it.productId },
          transaction: t,
        });
      }
    });
  }

  await transaction.reload({
    include: [{ model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
  });

  return { transaction, paymentResult: auth.result, paymentReason: auth.reason };
}

async function cancelById(transactionId, userId, { reason } = {}) {
  return sequelize.transaction(async (t) => {
    // Lock pessimista só na linha da Transaction (sem JOINs para evitar problema
    // do "FOR UPDATE" com tabelas filhas no Postgres).
    const tx = await Transaction.findByPk(transactionId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!tx) {
      const err = new Error('Transação não encontrada.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (tx.userId !== userId) {
      const err = new Error('Você não tem permissão para cancelar essa transação.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (!tx.isCancellable()) {
      throw new InvalidTransitionError(
        `Transação no status "${tx.status}" não pode ser cancelada.`
      );
    }

    // Itens carregados em query separada, ainda dentro da SQL transaction.
    const items = await TransactionItem.findAll({
      where: { transactionId: tx.id },
      transaction: t,
    });

    for (const item of items) {
      await Product.increment('stock', {
        by: item.quantity,
        where: { id: item.productId },
        transaction: t,
      });
    }

    await tx.update(
      {
        status: 'CANCELLED',
        cancellationReason: reason || 'Cancelada pelo cliente.',
        cancelledAt: new Date(),
      },
      { transaction: t }
    );

    return tx;
  });
}

async function listByUser(userId) {
  return Transaction.findAll({
    where: { userId },
    include: [
      {
        model: TransactionItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function listAll() {
  return Transaction.findAll({
    include: [
      {
        model: TransactionItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }],
      },
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function findByIdForUser(transactionId, userId) {
  return Transaction.findOne({
    where: { id: transactionId, userId },
    include: [
      {
        model: TransactionItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }],
      },
    ],
  });
}

module.exports = {
  TAX_RATE,
  checkout,
  cancelById,
  listByUser,
  listAll,
  findByIdForUser,
  ProductNotFoundError,
  InsufficientStockError,
  InvalidTransitionError,
};
