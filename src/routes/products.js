'use strict';

const express = require('express');
const productController = require('../controllers/productController');
const { isAuthenticated, requireRole } = require('../middlewares/auth');

const router = express.Router();
const adminOnly = [isAuthenticated, requireRole('ADMIN')];

router.get('/products', productController.index);

router.get('/products/new', ...adminOnly, productController.showCreateForm);
router.post('/products', ...adminOnly, productController.create);

router.get('/products/:id(\\d+)/edit', ...adminOnly, productController.showEditForm);
router.put('/products/:id(\\d+)', ...adminOnly, productController.update);
router.delete('/products/:id(\\d+)', ...adminOnly, productController.delete);

module.exports = router;
