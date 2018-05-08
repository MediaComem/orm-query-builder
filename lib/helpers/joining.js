const inflection = require('inflection');
const _ = require('lodash');

class OrmQueryJoiningHelper {
  constructor(table) {
    if (!_.isString(table)) {
      throw new Error('Table name must be a string');
    }

    this.table = table;
    this.possibleJoins = {};
  }

  use(builder) {
    builder.before('start', context => this.init(context));
    builder.before('end', context => this.addRequiredJoins(context));
  }

  join(name, options = {}) {
    if (this.possibleJoins[name]) {
      throw new Error(`A join named "${name}" is already defined`);
    }

    this.possibleJoins[name] = new OrmQueryJoinDefinition(this.table, name, options);
    return this;
  }

  init(context) {
    context.requiredJoins = [];
    context.requireJoin = (...relations) => {
      context.requiredJoins = _.union(context.requiredJoins, relations);
    };
  }

  addRequiredJoins(context) {

    const requiredJoins = context.requiredJoins;
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
      query = join.apply(query);
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
    this.joinType = options.type || 'innerJoin';
    this.joinTable = options.joinTable || name;
    this.key = options.key || `${this.table}.id`;
    this.joinKey = options.joinKey || `${this.joinTable}.${inflection.singularize(this.table)}_id`;
    this.requiredJoins = _.uniq(_.compact([ options.requiredJoin, ...(options.requiredJoins || []) ]));
  }

  apply(query) {
    // FIXME: move to adapter
    return query.query(qb => qb[this.joinType](this.joinTable !== this.name ? `${this.joinTable} as ${this.name}` : this.name, this.key, this.joinKey));
  }
}

module.exports = (...args) => new OrmQueryJoiningHelper(...args);
