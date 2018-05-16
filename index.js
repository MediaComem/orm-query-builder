const adapters = require('./lib/adapters');
const OrmQueryBuilder = require('./lib/builder');
const OrmQueryConfig = require('./lib/config');
const OrmQueryContext = require('./lib/context');
const plugins = require('./lib/plugins');

module.exports = {
  bookshelfAdapter: adapters.bookshelf,
  OrmQueryBuilder, OrmQueryConfig, OrmQueryContext,
  ...plugins
};
