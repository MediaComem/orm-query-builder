const adapters = require('./lib/adapters');
const OrmQueryBuilder = require('./lib/builder');
const OrmQueryConfig = require('./lib/config');
const OrmQueryContext = require('./lib/context');
const plugins = require('./lib/plugins');
const OrmQueryWrapper = require('./lib/wrapper');

module.exports = {
  bookshelfAdapter: adapters.bookshelf,
  OrmQueryBuilder, OrmQueryConfig, OrmQueryContext, OrmQueryWrapper,
  wrap: OrmQueryWrapper.wrap, unwrap: OrmQueryWrapper.unwrap,
  ...plugins
};
