const inflection = require('inflection');
const _ = require('lodash');

const REQUIRED_JOINS = Symbol('joining-helper-required-joins');

class OrmQueryJoiningHelper {
  constructor(table) {
    this.table = table; // string or ORM model
    this.possibleJoins = {};
    this.modelRelations = {};
  }

  use(builder) {

    const context = builder.context;

    _.each(this.modelRelations, (options, name) => {
      const newJoins = context.adapter.getJoinDefinitions(this.table, name, options);
      newJoins.forEach(join => this.join(join.name, _.omit(join, 'name')));
    });

    _.each(this.possibleJoins, join => {
      join.init(context);
    });

    builder.before('start', context => this.init(context));
    builder.before('query', context => this.addRequiredJoins(context));
  }

  join(name, options = {}) {
    if (this.possibleJoins[name]) {
      throw new Error(`A join named "${name}" is already defined`);
    }

    this.possibleJoins[name] = new OrmQueryJoinDefinition(this.table, name, options);
    return this;
  }

  relation(name, options = {}) {
    if (this.modelRelations[name]) {
      throw new Error(`Relation "${name}" has already been defined`);
    }

    this.modelRelations[name] = options;
    return this;
  }

  relations(...names) {

    let options = {};
    if (typeof(_.last(names)) !== 'string') {
      options = _.pop(names);
    }

    for (let name of names) {
      this.relation(name, options);
    }

    return this;
  }

  init(context) {
    context[REQUIRED_JOINS] = [];
    context.requireJoin = (...joins) => {

      const unknownJoins = joins.filter(join => !this.possibleJoins[join]);
      if (unknownJoins.length) {
        throw new Error(`The following joins have not been defined: ${unknownJoins.join(', ')}`);
      }

      context[REQUIRED_JOINS] = _.union(context.requiredJoins, joins);
    };
  }

  addRequiredJoins(context) {

    const requiredJoins = context[REQUIRED_JOINS];
    if (!requiredJoins.length) {
      return;
    }

    for (let i = 0; i < requiredJoins.length; i++) {
      const requiredJoin = requiredJoins[i];
      const additionalJoins = _.difference(this.possibleJoins[requiredJoin].requiredJoins, requiredJoins);
      if (additionalJoins.length) {
        requiredJoins.splice(i, 0, ...additionalJoins);
      }
    }

    let query = context.query;
    const joinsToApply = _.values(_.pick(this.possibleJoins, requiredJoins));

    for (let join of joinsToApply) {
      join.apply(context);
    }

    context.query = query;
  }
}

class OrmQueryJoinDefinition {
  constructor(table, name, options = {}) {
    if (!table) {
      throw new Error('Table is required');
    } else if (!name) {
      throw new Error('Name is required');
    }

    this.table = table;
    this.name = name;
    this.options = options;
  }

  init(context) {

    const options = this.options;
    const tableName = typeof(this.table) === 'string' ? this.table : context.adapter.getTableName(this.table);

    this.joinTable = options.joinTable || this.name;
    this.column = options.column || `${tableName}.id`;
    this.joinColumn = options.joinColumn || `${this.joinTable}.${inflection.singularize(tableName)}_id`;
    this.requiredJoins = _.uniq(_.compact([ options.requiredJoin, ...(options.requiredJoins || []) ]));
  }

  apply(context) {
    const result = context.adapter.applyJoinDefinition(context, this);
    if (result) {
      context.query = result;
    }
  }
}

module.exports = (...args) => new OrmQueryJoiningHelper(...args);
