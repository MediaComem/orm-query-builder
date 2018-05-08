class OrmQueryEagerLoadingHelper {
  constructor() {
    this.eagerLoads = [];
  }

  load(relations, options = {}) {
    this.eagerLoads.push({ relations, options });
    return this;
  }

  async execute(context) {
    await Promise.all(this.eagerLoads.map(async eagerLoad => {
      context.result = await Promise.resolve(context.adapter.eagerLoad(context, eagerLoad.relations, eagerLoad.options));
    }));
  }
}

module.exports = (...args) => new OrmQueryEagerLoadingHelper(...args);
