const inflection = require('inflection');
const _ = require('lodash');

const OrmQueryContext = require('./context');
const OrmQueryExecutor = require('./executor');

const DEFAULT_ADAPTER = 'bookshelf';

class OrmQueryBuilder {
  constructor(options = {}) {
    this.context = options instanceof OrmQueryContext ? options : new OrmQueryContext(options);
  }

  modifiers(predicate, ...modifiers) {
    this.context.modifierGroups.push({ predicate, modifiers });
    return this;
  }

  serializers(...serializers) {
    this.context.serializerGroups.push(serializers);
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
