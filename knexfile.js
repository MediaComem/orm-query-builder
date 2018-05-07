/* istanbul ignore file */

const config = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL || 'postgres://localhost/orm-query-builder'
};

module.exports = {
  development: config,
  test: config
};
