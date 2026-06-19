'use strict';

const express = require('express');
const checkoutController = require('../controllers/checkoutController');
const { isAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.get('/checkout', isAuthenticated, checkoutController.show);
router.post('/checkout', isAuthenticated, checkoutController.submit);

module.exports = router;
