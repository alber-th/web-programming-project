'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transaction_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('transaction_items', ['transaction_id']);
    await queryInterface.addIndex('transaction_items', ['product_id']);

    // Backfill: gera um item para cada Transaction legada (product_id + quantity já existem na linha).
    await queryInterface.sequelize.query(`
      INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, created_at, updated_at)
      SELECT id, product_id, quantity,
             CASE WHEN quantity > 0 THEN ROUND(total_price / quantity, 2) ELSE total_price END,
             created_at, updated_at
        FROM transactions
       WHERE product_id IS NOT NULL;
    `);
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.dropTable('transaction_items');
  },
};
