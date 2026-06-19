'use strict';

const express = require('express');
const transactionController = require('../controllers/transactionController');
const { isAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.get('/transactions', isAuthenticated, transactionController.listForCurrentUser);
router.get('/transactions/:id(\\d+)', isAuthenticated, transactionController.show);
router.post('/transactions/:id(\\d+)/cancel', isAuthenticated, transactionController.cancel);

module.exports = router;
