'use strict';

const { Model } = require('sequelize');

const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'];

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      // productId/quantity continuam existindo (linhas legadas pré-carrinho),
      // mas o relacionamento canônico passa por TransactionItem.
      Transaction.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
      Transaction.hasMany(models.TransactionItem, {
        foreignKey: 'transactionId',
        as: 'items',
      });
    }

    isCancellable() {
      return this.status === 'PENDING' || this.status === 'PROCESSING';
    }
  }

  Transaction.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Legados: produtos com 1 item compravam direto. Mantidos como nullable.
      productId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1 },
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      taxes: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      status: {
        type: DataTypes.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      cardholderName: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      cardLastFour: {
        type: DataTypes.STRING(4),
        allowNull: true,
      },
      cancellationReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      processingStartedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'transactions',
    }
  );

  Transaction.STATUSES = STATUSES;
  return Transaction;
};
