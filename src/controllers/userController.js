'use strict';

const userService = require('../services/userService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function renderRegisterForm(res, { formData = {}, errors = {}, status = 200 } = {}) {
  res.status(status).render('auth/register', {
    title: 'Criar conta — Cloud Key',
    formData,
    errors,
  });
}

function renderLoginForm(res, { formData = {}, errors = {}, status = 200 } = {}) {
  res.status(status).render('auth/login', {
    title: 'Entrar — Cloud Key',
    formData,
    errors,
  });
}

function validateRegisterInput({ name, email, password, passwordConfirmation }) {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Nome é obrigatório.';
  }

  if (!email || !email.trim()) {
    errors.email = 'E-mail é obrigatório.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'E-mail inválido.';
  }

  if (!password) {
    errors.password = 'Senha é obrigatória.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (password !== passwordConfirmation) {
    errors.passwordConfirmation = 'As senhas não conferem.';
  }

  return errors;
}

exports.showRegisterForm = (req, res) => {
  renderRegisterForm(res);
};

exports.register = async (req, res, next) => {
  const { name, email, password, passwordConfirmation } = req.body;
  const formData = { name, email };

  const errors = validateRegisterInput({ name, email, password, passwordConfirmation });
  if (Object.keys(errors).length > 0) {
    return renderRegisterForm(res, { formData, errors, status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await userService.findByEmail(normalizedEmail);
    if (existing) {
      return renderRegisterForm(res, {
        formData,
        errors: { email: 'Este e-mail já está cadastrado.' },
        status: 400,
      });
    }

    await userService.registerUser({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    req.flash('success', 'Cadastro realizado com sucesso! Faça login para continuar.');
    return res.redirect('/login');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return renderRegisterForm(res, {
        formData,
        errors: { email: 'Este e-mail já está cadastrado.' },
        status: 400,
      });
    }
    return next(err);
  }
};

exports.showLoginForm = (req, res) => {
  renderLoginForm(res);
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  const formData = { email };
  const errors = {};

  if (!email || !email.trim()) errors.email = 'E-mail é obrigatório.';
  if (!password) errors.password = 'Senha é obrigatória.';

  if (Object.keys(errors).length > 0) {
    return renderLoginForm(res, { formData, errors, status: 400 });
  }

  try {
    const user = await userService.verifyCredentials(
      email.trim().toLowerCase(),
      password
    );

    if (!user) {
      return renderLoginForm(res, {
        formData,
        errors: { _global: 'E-mail ou senha inválidos.' },
        status: 401,
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;

    req.flash('success', `Bem-vindo de volta, ${user.name}!`);
    return res.redirect(returnTo);
  } catch (err) {
    return next(err);
  }
};

exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
};
