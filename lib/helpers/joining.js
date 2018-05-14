const inflection = require('inflection');
const { compact, difference, each, intersection, last, omit, pick, pop, pull, union, uniq, values } = require('lodash');

const REQUIRED_JOINS = Symbol('joining-helper-required-joins');

class OrmQueryJoiningHelper {
  constructor(table) {
    this.table = table; // string or ORM model
    this.possibleJoins = {};
    this.modelRelations = {};
  }

  use(builder) {

    const config = builder.config;

    each(this.modelRelations, (options, name) => {
      const newJoins = config.adapter.getJoinDefinitions(this.table, name, options, config);
      newJoins.forEach(join => this.join(join.name, omit(join, 'name')));
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
    if (typeof(last(names)) !== 'string') {
      options = pop(names);
    }

    for (let name of names) {
      this.relation(name, options);
    }

    return this;
  }

  init(context) {

    each(this.possibleJoins, join => join.init(context));

    context[REQUIRED_JOINS] = [];
    context.requireJoin = (...joins) => {

      const unknownJoins = joins.filter(join => !this.possibleJoins[join]);
      if (unknownJoins.length) {
        throw new Error(`The following joins have not been defined: ${unknownJoins.join(', ')}`);
      }

      context[REQUIRED_JOINS] = union(context.requiredJoins, joins);
    };
  }

  addRequiredJoins(context) {

    const requiredJoins = context[REQUIRED_JOINS];
    if (!requiredJoins.length) {
      return;
    }

    for (let i = 0; i < requiredJoins.length; i++) {
      const requiredJoin = requiredJoins[i];
      const additionalJoins = difference(this.possibleJoins[requiredJoin].requiredJoins, requiredJoins);
      if (additionalJoins.length) {
        requiredJoins.splice(i, 0, ...additionalJoins);
      }
    }

    const sortedJoins = this.getSortedJoins(requiredJoins);

    let query = context.get('query');
    const joinsToApply = values(pick(this.possibleJoins, sortedJoins));

    for (let join of joinsToApply) {
      join.apply(context);
    }

    context.query = query;
  }

  getSortedJoins(requiredJoins) {

    const sortedJoins = [];
    const remainingJoins = requiredJoins;

    const baseJoins = remainingJoins.filter(join => !this.possibleJoins[join].requiredJoins.length);
    sortedJoins.push(...baseJoins);
    pull(remainingJoins, ...baseJoins);

    let i = 0;
    while (remainingJoins.length) {
      if (i >= 10) {
        throw new Error(`Could not find correct join order after ${i} attempts`);
      }

      const dependentJoins = remainingJoins.filter(join => intersection(this.possibleJoins[join].requiredJoins, sortedJoins).length);
      sortedJoins.push(...dependentJoins);
      pull(remainingJoins, ...dependentJoins);

      i++;
    }

    return sortedJoins;
  }
}

class OrmQueryJoinDefinition {
  constructor(table, name, options = {}) {
    if (!table) {
      throw new Error('Table is required');
    } else if (!name) {
      throw new Error('Name is required');
    } else if (!options) {
      throw new Error('Options are required');
    } else if (!options.column) {
      throw new Error('Option "column" is required (the column name on which to join in the source table)');
    } else if (!options.joinColumn) {
      throw new Error('Option "joinColumn" is required (the column name on which to join in the target table)');
    }

    this.table = table;
    this.name = name;
    this.options = options;
  }

  init(context) {

    const options = this.options;
    const tableName = typeof(this.table) === 'string' ? this.table : context.adapter.getTableName(this.table, context);

    this.joinTable = options.joinTable || this.name;
    this.column = options.column;
    this.joinColumn = options.joinColumn;
    this.requiredJoins = uniq(compact([ options.requiredJoin, ...(options.requiredJoins || []) ]));
  }

  apply(context) {
    const result = context.adapter.applyJoinDefinition(context.get('query'), this, context);
    if (result) {
      context.set('query', result);
    }
  }
}

module.exports = (...args) => new OrmQueryJoiningHelper(...args);
