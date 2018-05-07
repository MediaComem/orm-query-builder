const inflection = require('inflection');
const _ = require('lodash');

const OrmQueryWrapper = require('../wrapper');

class OrmQuerySortingModifier {
  constructor(...sortDefinitions) {
    this.sorts = {};

    for (let sortDefinition of sortDefinitions) {
      if (typeof(sortDefinition) === 'string') {
        this.sort(sortDefinition, (query, direction, context) => {
          return context.wrap(context.adapter.orderQueryBy(query, inflection.underscore(sortDefinition), direction));
        });
      } else {
        throw new Error(`Unsupported sort type ${typeof(sortDefinition)}`);
      }
    }
  }

  sort(name, func) {
    if (this.sorts[name]) {
      throw new Error(`Sort "${name}" is already defined`);
    }

    this.sorts[name] = func;
    return this;
  }

  default(...sorts) {

    this.defaultSort = _.flatten(sorts).map(sort => {
      if (typeof(sort) === 'string') {
        const parts = sort.split('-', 2);
        return { name: parts[0], direction: parts[1] ? parts[1].toUpperCase() : 'ASC' };
      } else if (_.isPlainObject(sort)) {
        return sort;
      } else {
        throw new Error(`Unsupported default sort type ${typeof(sort)}`);
      }
    });

    for (let sort of this.defaultSort) {
      if (!this.sorts[sort.name]) {
        throw new Error(`Undefined sort name "${sort.name}"`);
      } else if (!_.includes([ 'ASC', 'DESC' ], sort.direction)) {
        throw new Error(`Unsupported sort order "${sort.direction}" for sort "${sort.name}"`);
      }
    }

    return this;
  }

  async modify(context) {

    const sortQueryParam = context.options.req.query.sort;
    let querySorts = _.isArray(sortQueryParam) ? sortQueryParam : _.compact([ sortQueryParam ]);
    querySorts = querySorts.map(criterion => {
      const match = criterion.match(/^(.*?)(?:-(asc|desc))?$/i);
      return {
        name: match[1],
        direction: match[2] ? match[2].toUpperCase() : 'ASC'
      };
    });

    // TODO: validate sort query parameters instead of silently ignoring invalid ones
    querySorts = _.filter(querySorts, sort => this.sorts[sort.name]);

    for (let sort of querySorts) {
      context.query = OrmQueryWrapper.unwrap(await Promise.resolve(this.sorts[sort.name](context.query, sort.direction, context)));
    }

    if (this.defaultSort) {
      const appliedSorts = querySorts.map(sort => sort.name);
      for (let sort of this.defaultSort) {
        if (!_.includes(appliedSorts, sort.name)) {
          context.query = OrmQueryWrapper.unwrap(await Promise.resolve(this.sorts[sort.name](context.query, sort.direction, context)));
        }
      }
    }
  }
}

module.exports = (...args) => new OrmQuerySortingModifier(...args);
