'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'image_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'category', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.removeColumn('products', 'category');
    await queryInterface.removeColumn('products', 'image_url');
  },
};
