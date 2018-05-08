const inflection = require('inflection');
const _ = require('lodash');

const OrmQueryContext = require('./context');
const OrmQueryExecutor = require('./executor');

const DEFAULT_ADAPTER = 'bookshelf';

class OrmQueryBuilder {
  constructor(options = {}) {
    this.context = options instanceof OrmQueryContext ? options : new OrmQueryContext(options);
  }

  before(stage, ...middlewares) {
    this.context.middlewareGroups.push({ predicate: before(stage), middlewares });
    return this;
  }

  on(stage, ...middlewares) {
    return this.after(stage, ...middlewares);
  }

  after(stage, ...middlewares) {
    this.context.middlewareGroups.push({ predicate: after(stage), middlewares });
    return this;
  }

  use(...middlewares) {

    for (let middleware of middlewares) {

      const use = middleware.use;
      if (typeof(use) !== 'function') {
        throw new Error('Middleware must have a "use" function');
      }

      use.call(middleware, this);
    }

    return this;
  }

  clone() {
    return new OrmQueryBuilder(this.context);
  }

  execute(options = {}) {
    return new OrmQueryExecutor(this.context.clone()).execute(options);
  }
}

function after(stage) {
  return (currentPosition, currentStage) => {
    return currentPosition === 'after' && currentStage === stage;
  };
}

function before(stage) {
  return (currentPosition, currentStage) => {
    return currentPosition === 'before' && currentStage === stage;
  };
}

module.exports = { after, before, OrmQueryBuilder };
