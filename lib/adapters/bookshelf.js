exports.createQuery = function(context) {
  if (typeof(context.options.baseQuery) === 'function') {
    return new context.options.baseQuery();
  } else {
    return context.options.baseQuery;
  }
};

exports.eagerLoad = function(context, relations, options) {
  return context.result.load(relations, options);
};

exports.executeCountQuery = function(context) {
  return context.query
    .clone()
    .query(qb => qb.clearOrder())
    .query(qb => qb.clearSelect())
    .count()
    .then(value => parseInt(value, 10));
};

exports.executeQuery = function(context) {
  return context.query.fetchAll();
};

exports.orderQueryBy = function(query, name, direction) {
  return query.orderBy(name, direction);
};

exports.paginateQuery = function(context) {
  return context.query.query(qb => qb.offset(context.pagination.offset).limit(context.pagination.limit));
};
