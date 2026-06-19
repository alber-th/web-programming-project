'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('transactions', 'status', {
      type: Sequelize.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'),
      allowNull: false,
      defaultValue: 'COMPLETED', // backfill: registros antigos já estavam concluídos
    });

    await queryInterface.addColumn('transactions', 'subtotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('transactions', 'taxes', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('transactions', 'cardholder_name', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn('transactions', 'card_last_four', {
      type: Sequelize.STRING(4),
      allowNull: true,
    });

    await queryInterface.addColumn('transactions', 'cancellation_reason', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('transactions', 'processing_started_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('transactions', 'completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('transactions', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Backfill subtotal = total_price para registros existentes (taxes = 0).
    await queryInterface.sequelize.query(
      'UPDATE transactions SET subtotal = total_price WHERE subtotal IS NULL;'
    );

    await queryInterface.changeColumn('transactions', 'subtotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.removeColumn('transactions', 'cancelled_at');
    await queryInterface.removeColumn('transactions', 'completed_at');
    await queryInterface.removeColumn('transactions', 'processing_started_at');
    await queryInterface.removeColumn('transactions', 'cancellation_reason');
    await queryInterface.removeColumn('transactions', 'card_last_four');
    await queryInterface.removeColumn('transactions', 'cardholder_name');
    await queryInterface.removeColumn('transactions', 'taxes');
    await queryInterface.removeColumn('transactions', 'subtotal');
    await queryInterface.removeColumn('transactions', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_transactions_status";');
  },
};
