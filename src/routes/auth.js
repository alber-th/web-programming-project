'use strict';

const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/register', userController.showRegisterForm);
router.post('/register', userController.register);

router.get('/login', userController.showLoginForm);
router.post('/login', userController.login);

router.post('/logout', userController.logout);

module.exports = router;
