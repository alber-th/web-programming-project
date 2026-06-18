'use strict';

const { Product } = require('../models');

const FEATURED_NAMES = [
  'Elden Ring',
  'Cyberpunk 2077',
  "Baldur's Gate 3",
  'The Witcher 3: Wild Hunt',
  'DOOM Eternal',
];

// Item de pré-venda mockado (não persiste no banco) — GTA 6 ainda não tem
// chave digital disponível para venda; representado como destaque do carrossel.
const GTA6_FEATURED = {
  id: null,
  name: 'Grand Theft Auto VI',
  platform: 'PlayStation 5 / Xbox Series X|S',
  category: 'Ação / Aventura',
  price: 449.90,
  imageUrl: null,
  status: 'Pré-venda',
  preorder: true,
  releaseInfo: 'Lançamento previsto: 26/05/2026',
};

function toFeatured(product) {
  return {
    id: product.id,
    name: product.name,
    platform: product.platform,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    status: 'Disponível',
    preorder: false,
  };
}

exports.index = async (req, res, next) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });

    const featuredFromCatalog = products
      .filter((p) => FEATURED_NAMES.includes(p.name))
      .map(toFeatured);

    const featured = [GTA6_FEATURED, ...featuredFromCatalog];

    res.render('home', {
      title: 'Cloud Key — Home',
      featured,
      products,
    });
  } catch (err) {
    return next(err);
  }
};
