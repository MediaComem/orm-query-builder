const { constant } = require('lodash');

class OrmQueryEagerLoadingHelper {
  constructor() {
    this.eagerLoads = [];
  }

  use(builder) {
    builder.after('end', this);
  }

  load(relations, options = {}) {
    this.eagerLoads.push({ predicate: constant(true), relations, options });
    return this;
  }

  loadWhen(predicate, relations, options = {}) {
    this.eagerLoads.push({ predicate, relations, options });
  }

  async execute(context) {
    await Promise.all(this.eagerLoads.map(async eagerLoad => {
      if (await Promise.resolve(eagerLoad.predicate(context))) {
        context.set('result', await Promise.resolve(context.adapter.eagerLoad(context.get('result'), eagerLoad.relations, eagerLoad.options, context)));
      }
    }));
  }
}

module.exports = (...args) => new OrmQueryEagerLoadingHelper(...args);
