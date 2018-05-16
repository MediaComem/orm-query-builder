const { get } = require('lodash');

const { resolveGetter } = require('../utils');

const ORIGINAL_QUERY = Symbol('pagination-plugin-original-query');

class OrmQueryPaginationPlugin {
  constructor(options = {}) {
    this.getOffset = resolveGetter(options.getOffset, context => context.options.offset);
    this.getLimit = resolveGetter(options.getLimit, context => context.options.limit);
    // FIXME: using lodash get should not be possible here
    this.getDefaultLimit = resolveGetter(options.getDefaultLimit, context => context.options.defaultLimit || 100);
    this.getMaxLimit = resolveGetter(options.getMaxLimit, context => context.options.maxLimit || 250);
  }

  use(builder) {
    builder.after('start', context => this.start(context));
    builder.on('countTotal', context => this.countTotal(context));
    builder.on('paginate', context => this.paginate(context));
  }

  start(context) {

    let offset = this.getOffset(context);
    let limit = this.getLimit(context);

    offset = parseInt(offset, 10);
    if (isNaN(offset) || offset < 0) {
      offset = 0;
    }

    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 0 || limit > this.getMaxLimit(context)) {
      limit = this.getDefaultLimit(context);
    }

    context.set('pagination', { offset, limit });
    context.addStages('countTotal', 'paginate');
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

module.exports = OrmQueryPaginationPlugin;
