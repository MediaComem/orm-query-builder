const _ = require('lodash');

class OrmQueryStrategy {
  constructor(stages = []) {
    this.stages = stages;
  }

  getStages(context) {
    return this.stages.slice();
  }

  on(stage, context) {
    if (typeof(this[stage]) === 'function') {
      return this[stage](context);
    }
  }
}

module.exports = OrmQueryStrategy;
