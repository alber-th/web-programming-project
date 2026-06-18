'use strict';

const cover = (appId) => `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;

const games = [
  { name: 'Hollow Knight',              platform: 'Steam', category: 'Metroidvania', price: 37.99,  stock: 80,  appId: 367520 },
  { name: 'Stardew Valley',             platform: 'Steam', category: 'Simulação',     price: 24.99,  stock: 120, appId: 413150 },
  { name: 'Hades',                      platform: 'Steam', category: 'Roguelike',     price: 49.99,  stock: 60,  appId: 1145360 },
  { name: 'Cyberpunk 2077',             platform: 'Steam', category: 'RPG',           price: 199.90, stock: 45,  appId: 1091500 },
  { name: 'The Witcher 3: Wild Hunt',   platform: 'Steam', category: 'RPG',           price: 79.90,  stock: 90,  appId: 292030 },
  { name: 'Elden Ring',                 platform: 'Steam', category: 'Action RPG',    price: 249.90, stock: 35,  appId: 1245620 },
  { name: 'DOOM Eternal',               platform: 'Steam', category: 'FPS',           price: 99.90,  stock: 50,  appId: 782330 },
  { name: 'Sekiro: Shadows Die Twice',  platform: 'Steam', category: 'Action',        price: 199.90, stock: 40,  appId: 814380 },
  { name: 'Disco Elysium',              platform: 'Steam', category: 'RPG',           price: 79.90,  stock: 55,  appId: 632470 },
  { name: 'Celeste',                    platform: 'Steam', category: 'Plataforma',    price: 39.99,  stock: 100, appId: 504230 },
  { name: "Baldur's Gate 3",            platform: 'Steam', category: 'RPG',           price: 199.90, stock: 30,  appId: 1086940 },
  { name: 'Half-Life 2',                platform: 'Steam', category: 'FPS',           price: 19.99,  stock: 150, appId: 220 },
  { name: 'Portal 2',                   platform: 'Steam', category: 'Puzzle',        price: 27.99,  stock: 110, appId: 620 },
];

module.exports = {
  async up(queryInterface /* , Sequelize */) {
    const now = new Date();
    const rows = games.map((g) => ({
      name: g.name,
      platform: g.platform,
      category: g.category,
      price: g.price,
      stock: g.stock,
      image_url: cover(g.appId),
      created_at: now,
      updated_at: now,
    }));
    await queryInterface.bulkInsert('products', rows);
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.bulkDelete('products', {
      name: games.map((g) => g.name),
    });
  },
};
