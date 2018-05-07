const _ = require('lodash');

class OrmQueryJoinDefinition {
  constructor(table, relations, options) {
    this.table = table;

    this.relations = _.uniq(_.isArray(relations) ? relations : _.compact([ relations ]));
    if (!this.relations.length) {
      throw new Error('Relations is required');
    } else if (!_.every(this.relations, _.isString)) {
      throw new Error('Relations must be an array of strings');
    }

    this.relationOptions = _.extend({}, options);
  }

  apply(query) {
    return query.query(qb => {
      return _.reduce(this.relations, (memo, relation) => {

        const options = this.relationOptions;
        const table = this.table;
        const joinType = options.type || 'innerJoin';
        const joinTable = options.joinTable || relation;
        const key = options.key || `${table}.id`;
        const joinKey = options.joinKey || `${joinTable}.${table}_id`;

        return memo[joinType](`${joinTable} as ${relation}`, key, joinKey);
      }, qb);
    })
  }

  isCompatibleWith(otherJoin) {
    return _.intersection(this.relations, otherJoin.relations).length === 0;
  }
}

module.exports = OrmQueryJoinDefinition;
