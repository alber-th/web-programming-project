'use strict';

const express = require('express');
const productController = require('../controllers/productController');
const { isAuthenticated, requireRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/products', productController.index);

router.get(
  '/products/new',
  isAuthenticated,
  requireRole('ADMIN'),
  productController.showCreateForm
);

router.post(
  '/products',
  isAuthenticated,
  requireRole('ADMIN'),
  productController.create
);

module.exports = router;
