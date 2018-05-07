const inflection = require('inflection');
const _ = require('lodash');

const OrmQueryContext = require('./context');
const OrmQueryExecutor = require('./executor');

const DEFAULT_ADAPTER = 'bookshelf';

class OrmQueryBuilder {
  constructor(options = {}) {
    this.context = new OrmQueryContext(options);
  }

  modifiers(predicate, ...modifiers) {
    this.context.modifierGroups.push({ predicate, modifiers });
    return this;
  }

  serializers(...serializers) {
    this.context.serializerGroups.push(serializers);
    return this;
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
