'use strict';

const express = require('express');
const cartController = require('../controllers/cartController');

const router = express.Router();

router.get('/cart', cartController.show);
router.post('/cart', cartController.add);
router.post('/cart/update', cartController.updateQuantity);
router.post('/cart/remove', cartController.remove);
router.post('/cart/clear', cartController.clear);

module.exports = router;
