const OrmQueryStrategy = require('../strategy');

const ORIGINAL_QUERY = Symbol('paginated-strategy-original-query');

class OrmQueryPaginatedStrategy extends OrmQueryStrategy {
  getStages() {
    return [ 'countTotal', 'paginate' ];
  }

  start(context) {

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

    context.set('pagination', { offset, limit });
  }

  async countTotal(context) {
    context.set('pagination.total', await context.count());
    context[ORIGINAL_QUERY] = context.adapter.getQueryIdentifier(context.get('query'), context);
  }

  async paginate(context) {

    const id = context.adapter.getQueryIdentifier(context.get('query'), context);
    if (id !== context[ORIGINAL_QUERY]) {
      context.set('pagination.filteredTotal', await context.count());
    } else {
      context.set('pagination.filteredTotal', context.get('pagination.total'));
    }

    const { offset, limit } = context.get('pagination');
    context.set('query', context.adapter.paginateQuery(context.get('query'), offset, limit, context));
  }
}

module.exports = () => new OrmQueryPaginatedStrategy();
