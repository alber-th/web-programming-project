'use strict';

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Você precisa estar logado para acessar essa página.');
  return res.redirect('/login');
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session && req.session.user;

    if (!user) {
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Você precisa estar logado para acessar essa página.');
      return res.redirect('/login');
    }

    if (!roles.includes(user.role)) {
      req.flash('error', 'Você não tem permissão para acessar essa página.');
      return res.redirect('/');
    }

    return next();
  };
}

module.exports = { isAuthenticated, requireRole };
