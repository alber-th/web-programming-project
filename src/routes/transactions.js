'use strict';

const express = require('express');
const transactionController = require('../controllers/transactionController');
const { isAuthenticated } = require('../middlewares/auth');

const router = express.Router();

router.get('/transactions', isAuthenticated, transactionController.listForCurrentUser);
router.post('/transactions', isAuthenticated, transactionController.createForCurrentUser);

module.exports = router;
