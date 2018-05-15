const OrmQueryEagerLoadingMiddleware = require('./eager-loading');
const { OrmQueryJoiningPlugin } = require('./joining');
const OrmQuerySortingMiddleware = require('./sorting');

module.exports = {
  eagerLoading: () => new OrmQueryEagerLoadingMiddleware(),
  joining: table => new OrmQueryJoiningPlugin(table),
  sorting: () => new OrmQuerySortingMiddleware()
};
