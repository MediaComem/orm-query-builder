const OrmQueryPaginatedStrategy = require('./paginated');

module.exports = {
  paginated: options => {
    return new OrmQueryPaginatedStrategy(options);
  }
};
