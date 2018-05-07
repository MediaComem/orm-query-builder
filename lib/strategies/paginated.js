const OrmQueryStrategy = require('../strategy');

class OrmQueryPaginatedStrategy extends OrmQueryStrategy {
  constructor() {
    super([ 'init', 'countTotal', 'paginate' ]);
  }

  init(context) {

    let offset = context.options.req.query.offset;
    let limit = context.options.req.query.limit;

    offset = parseInt(offset, 10);
    if (isNaN(offset) || offset < 0) {
      offset = 0;
    }

    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 0 || limit > 250) {
      limit = 100;
    }

    context.pagination = { offset, limit };
  }

  async countTotal(context) {
    context.pagination.total = await Promise.resolve(context.adapter.executeCountQuery(context));
  }

  async paginate(context) {
    if (context.stage.modified) {
      context.pagination.filteredTotal = await Promise.resolve(context.adapter.executeCountQuery(context));
    } else {
      context.pagination.filteredTotal = context.pagination.total;
    }

    context.query = context.adapter.paginateQuery(context);
  }
}

module.exports = () => new OrmQueryPaginatedStrategy();