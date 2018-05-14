class OrmQueryWrapper {
  static wrap(query) {
    return query instanceof OrmQueryWrapper ? query : new OrmQueryWrapper(query);
  }

  static unwrap(query) {
    return query instanceof OrmQueryWrapper ? query.unwrap() : query;
  }

  constructor(query) {
    if (!query) {
      throw new Error('Query is required');
    } else if (query instanceof OrmQueryWrapper) {
      throw new Error('Query is already wrapped');
    }

    this.query = query;
  }

  unwrap() {
    return this.query;
  }
}

module.exports = OrmQueryWrapper;
