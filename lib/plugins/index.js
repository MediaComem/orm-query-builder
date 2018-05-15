const OrmQueryEagerLoadingMiddleware = require('./eager-loading');
const { OrmQueryJoiningPlugin } = require('./joining');
const OrmQueryPaginationPlugin = require('./pagination');
const OrmQuerySortingMiddleware = require('./sorting');

module.exports = {
  eagerLoading: () => new OrmQueryEagerLoadingMiddleware(),
  joining: table => new OrmQueryJoiningPlugin(table),
  pagination: options => new OrmQueryPaginationPlugin(options),
  sorting: options => new OrmQuerySortingMiddleware(options)
};
