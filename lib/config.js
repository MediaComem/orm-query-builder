const { extend, isPlainObject } = require('lodash');

const adapters = require('./adapters');
const OrmQueryMiddlewareGroup = require('./middleware-group');
const { resolveOption } = require('./utils');
const OrmQueryWrapper = require('./wrapper');

class OrmQueryConfig {
  constructor(options = {}) {
    this.adapter = resolveOption('adapter', options.adapter, adapters, adapters.bookshelf, options.adapterOptions);
    this.options = options;
    this.middlewareGroups = [];
  }

  addMiddlewareGroup(position, stage, middlewares) {
    this.middlewareGroups.push(new OrmQueryMiddlewareGroup(position, stage, middlewares));
  }

  clone() {
    const context = new OrmQueryConfig(extend({}, this.options, { adapter: this.adapter }));
    context.middlewareGroups = this.middlewareGroups.slice();
    return context;
  }
}

module.exports = OrmQueryConfig;
