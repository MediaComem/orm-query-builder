class OrmQueryWrapper {
  static wrap(query) {
    return query instanceof OrmQueryWrapper ? query : new OrmQueryWrapper(query);
  }

  static unwrap(query) {
    return query instanceof OrmQueryWrapper ? query.query : query;
  }

  constructor(query) {
    if (!query) {
      throw new Error('Query is required');
    }

    this._query = query;
  }

  get query() {
    return this._query;
  }
}

module.exports = OrmQueryWrapper;
