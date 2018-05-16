const { compact, filter, flatten, get, includes, isArray, isPlainObject } = require('lodash');

const { resolveGetter } = require('../utils');

class OrmQuerySortingMiddleware {
  constructor(options = {}) {
    this.definedSorts = {};
    this.getSort = resolveGetter(options.getSort, context => context.options.sort);
    this.createSimpleSort = get(options, 'createSimpleSort', name => (direction, context) => query => {
      return context.adapter.orderQueryBy(query, name, direction, context);
    });
  }

  use(builder) {
    builder.before('end', this);
  }

  sort(name, factory) {
    if (this.definedSorts[name]) {
      throw new Error(`Sort "${name}" is already defined`);
    }

    this.definedSorts[name] = factory;
    return this;
  }

  sorts(...sortDefinitions) {

    for (let sortDefinition of sortDefinitions) {
      if (typeof(sortDefinition) === 'string') {
        this.sort(sortDefinition, this.createSimpleSort(sortDefinition));
      } else {
        // TODO: support arrays (recall this method with elements) & object
        throw new Error(`Unsupported sort type ${typeof(sortDefinition)}`);
      }
    }

    return this;
  }

  default(...sorts) {

    this.defaultSort = flatten(sorts).map(sort => {
      if (typeof(sort) === 'string') {
        const parts = sort.split('-', 2);
        return {
          name: parts[0],
          direction: parts[1] ? parts[1].toLowerCase() : 'asc'
        };
      } else if (isPlainObject(sort)) {
        return {
          name: sort.name,
          direction: typeof(sort.direction) === 'string' ? sort.direction.toLowerCase() : (sort.direction || 'asc')
        };
      } else {
        throw new Error(`Unsupported default sort type ${typeof(sort)}`);
      }
    });

    for (let sort of this.defaultSort) {
      if (!this.definedSorts[sort.name]) {
        throw new Error(`Undefined sort "${sort.name}"`);
      } else if (!includes([ 'asc', 'desc' ], sort.direction)) {
        throw new Error(`Unsupported sort order "${sort.direction}" for sort "${sort.name}"`);
      }
    }

    return this;
  }

  async execute(context) {

    const sortParam = this.getSort(context);
    let querySorts = isArray(sortParam) ? sortParam : compact([ sortParam ]);
    querySorts = querySorts.map(criterion => {
      const match = criterion.match(/^(.*?)(?:-(asc|desc))?$/i);
      return {
        name: match[1],
        direction: match[2] ? match[2].toUpperCase() : 'ASC'
      };
    });

    // TODO: validate sort query parameters instead of silently ignoring invalid ones
    querySorts = filter(querySorts, sort => this.definedSorts[sort.name]);

    for (let sort of querySorts) {
      const sortFunc = await Promise.resolve(this.definedSorts[sort.name](sort.direction, context));
      context.set('query', sortFunc(context.get('query')))
    }

    if (this.defaultSort) {
      const appliedSorts = querySorts.map(sort => sort.name);
      for (let sort of this.defaultSort) {
        if (!includes(appliedSorts, sort.name)) {
          const sortFunc = await Promise.resolve(this.definedSorts[sort.name](sort.direction, context));
          context.set('query', sortFunc(context.get('query')))
        }
      }
    }
  }
}

module.exports = OrmQuerySortingMiddleware;
