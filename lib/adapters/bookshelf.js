const inflection = require('inflection');
const { includes } = require('lodash');

const BOOKSHELF_JOIN_TYPES = [ 'innerJoin', 'leftJoin', 'leftOuterJoin', 'rightJoin', 'rightOuterJoin', 'fullOuterJoin', 'crossJoin' ];

exports.applyJoinDefinition = function(query, joinDefinition, context) {
  if (joinDefinition.joinType && !includes(BOOKSHELF_JOIN_TYPES, joinDefinition.joinType)) {
    throw new Error(`Join type "${joinDefinition.joinType}" is not supported by this adapter`);
  }

  const joinType = joinDefinition.joinType || 'innerJoin';
  const joinTable = joinDefinition.joinTable !== joinDefinition.name ? `${joinDefinition.joinTable} as ${joinDefinition.name}` : joinDefinition.name;
  return query.query(qb => qb[joinType](joinTable, joinDefinition.column, joinDefinition.joinColumn));
};

exports.createQuery = function(context) {
  if (typeof(context.options.baseQuery) === 'function') {
    return new context.options.baseQuery();
  } else {
    return context.options.baseQuery;
  }
};

exports.eagerLoad = function(result, relations, options, context) {
  return result.load(relations, options);
};

exports.executeQuery = function(query, context) {
  return query.fetchAll();
};

exports.executeCountQuery = function(query, context) {
  return query
    .clone()
    .query(qb => qb.clearOrder())
    .query(qb => qb.clearSelect())
    .count()
    .then(value => parseInt(value, 10));
};

exports.getJoinDefinitions = function(model, relation, options, config) {
  if (typeof(relation) !== 'string') {
    throw new Error(`Relation must be a string, got ${typeof(relation)}`);
  }

  const relationFunc = model.prototype[relation];
  if (typeof(relationFunc) !== 'function') {
    throw new Error(`Model has no relation "${relation}"`);
  }

  const relationObject = relationFunc.call(model.prototype);
  if (!relationObject || !relationObject.relatedData) {
    throw new Error(`Model method "${relation}" is not a relation`);
  }

  const relatedData = relationObject.relatedData;
  switch (relatedData.type) {
    case 'belongsTo':
      return manyToOneJoinDefinition(relation, relatedData, options);
    case 'belongsToMany':
      return manyToManyJoinDefinition(relation, relatedData, options);
    case 'hasMany':
    case 'hasOne':
      return oneToManyJoinDefinition(relation, relatedData, options);
    default:
      throw new Error(`Unsupported bookshelf relation type "${relatedData.type}"`);
  }
};

exports.getQueryIdentifier = function(query, context) {
  return query.query().toString();
};

exports.getTableName = function(model, context) {
  return model.prototype.tableName;
};

exports.orderQueryBy = function(query, name, direction, context) {
  return query.orderBy(name, direction);
};

exports.paginateQuery = function(query, offset, limit, context) {
  return query.query(qb => qb.offset(offset).limit(limit));
};

function manyToOneJoinDefinition(relation, relatedData, options = {}) {

  let {
    foreignKey, foreignKeyTarget,
    parentIdAttribute, parentTableName,
    targetIdAttribute, targetTableName
  } = relatedData;

  foreignKey = options.foreignKey || foreignKey || `${parentTableName}.${inflection.singularize(targetTableName)}_${targetIdAttribute}`;
  foreignKeyTarget = options.foreignKeyTarget || foreignKeyTarget || `${targetTableName}.${targetIdAttribute}`;

  return [
    {
      name: options.joinName || targetTableName,
      column: foreignKey,
      joinType: options.joinType,
      joinTable: targetTableName,
      joinColumn: foreignKeyTarget
    }
  ];
}

function manyToManyJoinDefinition(relation, relatedData, options = {}) {

  let {
    joinTableName,
    foreignKey, otherKey,
    foreignKeyTarget, otherKeyTarget,
    parentIdAttribute, parentTableName,
    targetIdAttribute, targetTableName
  } = relatedData;

  joinTableName = options.joinTableName || joinTableName || [ parentTableName, targetTableName ].sort().join('_');
  foreignKey = options.foreignKey || foreignKey || `${joinTableName}.${inflection.singularize(parentTableName)}_${parentIdAttribute}`;
  otherKey = options.otherKey || otherKey || `${joinTableName}.${inflection.singularize(targetTableName)}_${targetIdAttribute}`;
  foreignKeyTarget = options.foreignKeyTarget || foreignKeyTarget || `${parentTableName}.${parentIdAttribute}`;
  otherKeyTarget = options.otherKeyTarget || otherKeyTarget || `${targetTableName}.${targetIdAttribute}`;

  return [
    {
      name: joinTableName,
      column: foreignKeyTarget,
      joinType: options.joinType,
      joinTable: joinTableName,
      joinColumn: foreignKey
    },
    {
      name: options.joinName || targetTableName,
      column: otherKey,
      joinType: options.joinType,
      joinTable: targetTableName,
      joinColumn: otherKeyTarget,
      requiredJoin: joinTableName
    }
  ];
}

function oneToManyJoinDefinition(relation, relatedData, options = {}) {

  let {
    foreignKey, foreignKeyTarget,
    parentIdAttribute, parentTableName,
    targetIdAttribute, targetTableName
  } = relatedData;

  foreignKey = options.foreignKey || foreignKey || `${targetTableName}.${inflection.singularize(parentTableName)}_${parentIdAttribute}`;
  foreignKeyTarget = options.foreignKeyTarget || foreignKeyTarget || `${parentTableName}.${parentIdAttribute}`;

  return [
    {
      name: options.joinName || targetTableName,
      column: foreignKeyTarget,
      joinType: options.joinType,
      joinTable: targetTableName,
      joinColumn: foreignKey
    }
  ];
}
