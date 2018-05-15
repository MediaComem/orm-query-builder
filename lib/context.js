const { clone, get, set } = require('lodash');

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
    this.stages = stages;
    return this;
  }

  pushStages(...stages) {
    return this.setStages([ ...this.stages, ...stages ]);
  }

  spliceStages(index, toRemove, ...stages) {
    const copy = this.stages.slice();
    copy.splice(index, toRemove, ...stages);
    return this.setStages(copy);
  }

  unshiftStages(...stages) {
    return this.setStages([ ...stages, ...this.stages ]);
  }
}

module.exports = OrmQueryContext;
