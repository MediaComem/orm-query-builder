const _ = require('lodash');

class OrmQueryStrategy {
  constructor(stages = []) {
    if (!_.isArray(stages)) {
      throw new Error(`Stages must be an array, got ${typeof(stages)}`);
    } else if (stages.some(stage => typeof(stage) !== 'string')) {
      throw new Error(`Stages must be an array of strings, got [${stages.map(stage => typeof(stage)).join(',')}]`);
    } else if (stages.indexOf('query') >= 0) {
      throw new Error(`The "query" stage is reserved`);
    } else if (_.uniq(stages).length !== stages.length) {
      throw new Error('Stages must have no duplicates');
    }

    this.stages = stages;
  }

  async apply(context, listener = {}) {

    const stages = this.stages.slice();
    for (let stage of stages) {

      if (typeof(listener.before) === 'function') {
        await Promise.resolve(listener.before(stage, context));
      }

      await Promise.resolve(this.on(stage, context));

      if (typeof(listener.after) === 'function') {
        await Promise.resolve(listener.after(stage, context));
      }
    }
  }

  on(stage, context) {
    if (typeof(this[stage]) === 'function') {
      return this[stage](context);
    }
  }
}

module.exports = OrmQueryStrategy;
