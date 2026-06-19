'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TransactionItem extends Model {
    static associate(models) {
      TransactionItem.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction',
      });
      TransactionItem.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product',
      });
    }

    lineTotal() {
      return Number(this.unitPrice) * this.quantity;
    }
  }

  TransactionItem.init(
    {
      transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
    },
    {
      sequelize,
      modelName: 'TransactionItem',
      tableName: 'transaction_items',
    }
  );

  return TransactionItem;
};
