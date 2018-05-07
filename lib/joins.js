const _ = require('lodash');

const OrmQueryJoinDefinition = require('./join');

class OrmQueryJoinsManager {
  constructor(table) {
    if (!_.isString(table)) {
      throw new Error('Table name must be a string');
    }

    this.table = table;
    this.possibleJoins = [];
    this.relations = [];
    this.mandatoryJoins = {};
  }

  join(...args) {

    const joinDef = new OrmQueryJoinDefinition(this.table, ...args);
    this.possibleJoins.push(joinDef);

    _.each(joinDef.relations, relation => {
      if (_.includes(this.relations, relation)) {
        delete this.mandatoryJoins[relation];
      } else {
        this.relations.push(relation);
        this.mandatoryJoins[relation] = joinDef;
      }
    });

    return this;
  }

  apply(query, requiredRelations) {
    if (!requiredRelations.length) {
      return query;
    }

    const joinsToApply = [];
    const remainingRelations = requiredRelations.slice();

    _.each(_.intersection(requiredRelations, _.keys(this.mandatoryJoins)), relation => {

      const mandatoryJoin = this.mandatoryJoins[relation];
      if (!_.includes(joinsToApply, mandatoryJoin)) {
        joinsToApply.push(mandatoryJoin);
      }

      _.pull(remainingRelations, relation);
    });

    if (remainingRelations.length) {
      const remainingJoins = _.difference(this.possibleJoins, joinsToApply);

      const validJoinChain = this.recursivelyFindCompatibleJoinsChain(remainingJoins, remainingRelations.slice());
      if (validJoinChain) {
        _.each(validJoinChain, join => joinsToApply.push(join));
        remainingRelations.length = 0;
      }

      if (remainingRelations.length) {
        throw new Error(`Could not find enough compatible joins to give access to the following relations: ${requiredRelations.join(', ')}`);
      }
    }

    _.each(joinsToApply, join => {
      query = join.apply(query);
    });

    return query;
  }

  recursivelyFindCompatibleJoinsChain(joins, relations) {

    const joinScores = _.reduce(joins, (memo, join, i) => {
      memo[i] = _.intersection(join.relations, relations).length;
      return memo;
    }, []);

    if (_.includes(joinScores, relations.length)) {
      return [
        _.find(joins, (join, i) => joinScores[i] === relations.length)
      ];
    } else {

      let currentScore = _.min(joinScores);
      const maxScore = _.max(joinScores);
      while (currentScore <= maxScore) {

        const currentJoins = _.filter(joins, (join, i) => joinScores[i] === currentScore);
        while (currentJoins.length) {
          const currentJoin = currentJoins.shift();
          const validChain = this.recursivelyFindCompatibleJoinsChain(currentJoins, _.difference(relations, currentJoin.relations));
          if (validChain) {
            return [ currentJoin, ...validChain ];
          }
        }

        currentScore++;
      }
    }
  }
}

module.exports = OrmQueryJoinsManager;
