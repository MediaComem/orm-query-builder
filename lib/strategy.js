class OrmQueryStrategy {
  getStages(context) {
    return [];
  }

  on(stage, context) {
    if (typeof(this[stage]) === 'function') {
      return this[stage](context);
    }
  }
}

module.exports = OrmQueryStrategy;
