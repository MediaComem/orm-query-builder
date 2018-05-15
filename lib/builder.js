const OrmQueryConfig = require('./config');
const OrmQueryExecutor = require('./executor');

class OrmQueryBuilder {
  constructor(options = {}) {
    this.config = options instanceof OrmQueryConfig ? options : new OrmQueryConfig(options);
  }

  before(stage, ...middlewares) {
    this.config.addMiddlewareGroup('before', stage, middlewares);
    return this;
  }

  on(stage, ...middlewares) {
    this.config.addMiddlewareGroup('on', stage, middlewares);
    return this;
  }

  after(stage, ...middlewares) {
    this.config.addMiddlewareGroup('after', stage, middlewares);
    return this;
  }

  use(...plugins) {

    for (let plugin of plugins) {
      if (typeof(plugin.use) !== 'function') {
        throw new Error('Plugin must have a "use" function');
      } else {
        plugin.use(this);
      }
    }

    return this;
  }

  clone() {
    return new OrmQueryBuilder(this.config.clone());
  }

  execute(options = {}) {
    return new OrmQueryExecutor(this.config.clone()).execute(options);
  }
}

module.exports = OrmQueryBuilder;
