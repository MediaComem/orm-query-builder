const { get } = require('lodash');

const OrmQueryStrategy = require('../strategy');

const ORIGINAL_QUERY = Symbol('paginated-strategy-original-query');

class OrmQueryPaginatedStrategy extends OrmQueryStrategy {
  constructor(options = {}) {
    super();
    this.getOffset = resolveGetter(options.getOffset, context => context.options.offset);
    this.getLimit = resolveGetter(options.getLimit, context => context.options.limit);
  }

  getStages() {
    return [ 'countTotal', 'paginate' ];
  }

  start(context) {

    let offset = this.getOffset(context);
    let limit = this.getLimit(context);

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

function resolveGetter(value, defaultGetter) {
  if (typeof(value) === 'function') {
    return value;
  } else if (typeof(value) === 'string') {
    return context => get(context, value);
  } else if (value) {
    throw new Error(`Unsupported option getter type ${typeof(value)}`);
  } else {
    return defaultGetter;
  }
}

module.exports = OrmQueryPaginatedStrategy;
