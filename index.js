const adapters = require('./lib/adapters');
const OrmQueryBuilder = require('./lib/builder');
const OrmQueryConfig = require('./lib/config');
const OrmQueryContext = require('./lib/context');
const helpers = require('./lib/helpers');
const OrmQueryPaginatedStrategy = require('./lib/strategies/paginated');
const OrmQueryStrategy = require('./lib/strategy');
const OrmQueryWrapper = require('./lib/wrapper');

module.exports = {
  bookshelfAdapter: adapters.bookshelf,
  OrmQueryBuilder, OrmQueryConfig, OrmQueryContext, OrmQueryWrapper, OrmQueryPaginatedStrategy, OrmQueryStrategy,
  wrap: OrmQueryWrapper.wrap, unwrap: OrmQueryWrapper.unwrap,
  ...helpers
};
