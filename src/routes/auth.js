'use strict';

const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/register', userController.showRegisterForm);
router.post('/register', userController.register);

// Placeholder até a feature de login ser implementada.
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Entrar — Cloud Key' });
});

module.exports = router;
