const _ = require('lodash');

const adapters = require('./adapters');
const strategies = require('./strategies');
const OrmQueryStrategy = require('./strategy');
const OrmQueryWrapper = require('./wrapper');

// TODO: split into config (read-only) & context
class OrmQueryContext {
  constructor(options = {}) {

    if (typeof(options.adapter) === 'string') {

      const adapterFactory = adapters[options.adapter];
      if (!adapterFactory) {
        throw new Error(`Unknown adapter "${options.adapter}"`);
      }

      this.adapter = adapterFactory();
    } else if (options.adapter) {
      this.adapter = options.adapter;
    } else {
      this.adapter = adapters.bookshelf();
    }

    if (typeof(options.strategy) === 'string') {

      const strategyFactory = strategies[options.strategy];
      if (!strategyFactory) {
        throw new Error(`Unknown strategy "${options.strategy}"`);
      }

      this.strategy = strategyFactory();
    } else if (options.strategy) {
      this.strategy = options.strategy;
    } else {
      this.strategy = new OrmQueryStrategy();
    }

    this.options = options;
    this.modifierGroups = [];
    this.serializerGroups = [];
  }

  clone() {
    const context = new OrmQueryContext(_.extend({}, this.options, { adapter: this.adapter, strategy: this.strategy }));
    context.modifierGroups = this.modifierGroups.slice();
    context.serializerGroups = this.serializerGroups.slice();
    return context;
  }

  wrap(query) {
    return OrmQueryWrapper.wrap(query);
  }
}

module.exports = OrmQueryContext;
