const { clone, get, set } = require('lodash');

class OrmQueryContext {
  constructor(config, executor) {
    this.config = config;
    this.executor = executor;
    this.options = clone(config.options);
    this.state = {};
  }

  get adapter() {
    return this.config.adapter;
  }

  get strategy() {
    return this.config.strategy;
  }

  get(key) {
    return get(this.state, key);
  }

  set(key, value) {
    return set(this.state, key, value);
  }

  async query(query = this.get('query')) {
    return await this.executor.emit('query', () => Promise.resolve(this.config.adapter.executeQuery(query, this)));
  }

  async count(query = this.get('query')) {
    return await this.executor.emit('query', () => Promise.resolve(this.config.adapter.executeCountQuery(query, this)));
  }
}

module.exports = OrmQueryContext;
