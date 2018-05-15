const { clone, get, isArray, set } = require('lodash');

class OrmQueryContext {
  constructor(config, executor) {
    this.config = config;
    this.executor = executor;
    this.options = clone(config.options);
    this.stages = [ 'start', 'end' ];
    this.state = {};
  }

  get adapter() {
    return this.config.adapter;
  }

  get(key) {
    return get(this.state, key);
  }

  set(key, value) {
    set(this.state, key, value);
    return this;
  }

  async query(query = this.get('query')) {
    return await this.executor.emit('query', () => Promise.resolve(this.config.adapter.executeQuery(query, this)));
  }

  async count(query = this.get('query')) {
    return await this.executor.emit('query', () => Promise.resolve(this.config.adapter.executeCountQuery(query, this)));
  }

  getStages() {
    return this.stages;
  }

  setStages(stages) {
    if (!isArray(stages)) {
      throw new Error(`Stages must be an array, got ${typeof(stages)}`);
    }

    this.stages = stages;
    return this;
  }

  addStages(...stages) {
    return this.setStages([ ...stages, ...this.stages ]);
  }
}

module.exports = OrmQueryContext;
