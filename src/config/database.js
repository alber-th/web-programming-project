require('dotenv').config();

const baseConfig = {
  dialect: process.env.DB_DIALECT || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cloud_key',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
};

module.exports = {
  development: baseConfig,
  test: { ...baseConfig, database: `${baseConfig.database}_test` },
  production: { ...baseConfig, logging: false },
};
