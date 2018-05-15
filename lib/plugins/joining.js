const inflection = require('inflection');
const { compact, difference, each, intersection, last, omit, pick, pull, union, uniq, values } = require('lodash');

const REQUIRED_JOINS = Symbol('joining-helper-required-joins');

class OrmQueryJoiningPlugin {
  constructor(table) {
    this.table = table; // string or ORM model
    this.possibleJoins = {};
    this.modelRelations = {};
  }

  use(builder) {

    const config = builder.config;

    // TODO: it would be better to do this at runtime (get table name from query)
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
      options = names.pop();
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

    const allRequiredJoins = this.getAllRequiredJoins(requiredJoins);
    const sortedJoins = this.getSortedJoins(allRequiredJoins);

    let query = context.get('query');
    const joinsToApply = values(pick(this.possibleJoins, sortedJoins));

    for (let join of joinsToApply) {
      join.apply(context);
    }

    context.query = query;
  }

  getAllRequiredJoins(requiredJoins) {
    return requiredJoins.reduce((memo, requiredJoin) => union(memo, [ requiredJoin, ...this.getAllRequiredJoins(this.possibleJoins[requiredJoin].requiredJoins) ]), []);
  }

  getSortedJoins(requiredJoins) {

    const sortedJoins = [];
    const remainingJoins = requiredJoins;

    // Start by adding any required joins that do not depend on other joins.
    sortedJoins.push(...remainingJoins.filter(join => !this.possibleJoins[join].requiredJoins.length));
    pull(remainingJoins, ...sortedJoins);

    // Then successively add joins that require those previously added.
    while (remainingJoins.length) {
      const dependentJoins = remainingJoins.filter(join => intersection(this.possibleJoins[join].requiredJoins, sortedJoins).length);
      sortedJoins.push(...dependentJoins);
      pull(remainingJoins, ...dependentJoins);
    }

    return sortedJoins;
  }
}

class OrmQueryJoinDefinition {
  constructor(table, name, options) {
    if (!table) {
      throw new Error('Join source table is required');
    } else if (!name) {
      throw new Error('Join name is required');
    } else if (!options) {
      throw new Error('Join options are required');
    } else if (!options.column) {
      throw new Error('Join option "column" is required (the column name on which to join in the source table)');
    } else if (!options.joinColumn) {
      throw new Error('Join option "joinColumn" is required (the column name on which to join in the target table)');
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

    const queryWithJoin = context.adapter.applyJoinDefinition(context.get('query'), this, context);
    if (!queryWithJoin) {
      throw new Error(`Adapter returned no result when applying join "${this.name}"`);
    }

    context.set('query', queryWithJoin);
  }
}

module.exports = { OrmQueryJoiningPlugin, OrmQueryJoinDefinition };
