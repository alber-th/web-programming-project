'use strict';

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Você precisa estar logado para acessar essa página.');
  return res.redirect('/login');
}

module.exports = { isAuthenticated };
