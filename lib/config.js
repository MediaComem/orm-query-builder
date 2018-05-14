const { extend, isPlainObject } = require('lodash');

const adapters = require('./adapters');
const strategies = require('./strategies');
const OrmQueryMiddlewareGroup = require('./middleware-group');
const OrmQueryStrategy = require('./strategy');
const OrmQueryWrapper = require('./wrapper');

class OrmQueryConfig {
  constructor(options = {}) {
    this.adapter = resolveOption('adapter', options.adapter, adapters, 'bookshelf');
    this.strategy = resolveOption('strategy', options.strategy, strategies, () => new OrmQueryStrategy());
    this.options = options;
    this.middlewareGroups = [];
  }

  addMiddlewareGroup(position, stage, middlewares) {
    this.middlewareGroups.push(new OrmQueryMiddlewareGroup(position, stage, middlewares));
  }

  clone() {
    const context = new OrmQueryConfig(extend({}, this.options, { adapter: this.adapter, strategy: this.strategy }));
    context.middlewareGroups = this.middlewareGroups.slice();
    return context;
  }
}

function resolveOption(type, value, availableFactories, defaultFactory) {
  if (typeof(value) === 'string') {

    const factory = availableFactories[value];
    if (!factory) {
      throw new Error(`Unknown ${type} "${value}"`);
    }

    return factory();
  } else if (value) {
    return value;
  } else {
    return typeof(defaultFactory) === 'function' ? defaultFactory() : availableFactories[defaultFactory]();
  }
}

module.exports = OrmQueryConfig;
