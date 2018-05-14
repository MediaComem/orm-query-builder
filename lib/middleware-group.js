const { includes, isArray } = require('lodash');

class OrmQueryMiddlewareGroup {
  constructor(position, stage, middlewares) {
    if (!includes([ 'before', 'after' ], position)) {
      throw new Error(`Middleware group position must be "before" or "after"; got ${typeof(position) === 'string' ? '"' + position + '"' : typeof(position)}`);
    } else if (typeof(stage) !== 'string') {
      throw new Error(`Middleware group stage must be a string, got ${typeof(stage)}`);
    } else if (!isArray(middlewares)) {
      throw new Error(`Middleware group middlewares must be an array, got ${typeof(middlewares)}`);
    } else if (!middlewares.length) {
      throw new Error('Middleware group middlewares must contain at least one middleware');
    } else if (middlewares.some(middleware => !middleware || (typeof(middleware) !== 'function' && typeof(middleware.execute) !== 'function'))) {
      throw new Error('Middleware group middlewares must be functions or have an "execute" property that is a function');
    }

    this.position = position;
    this.stage = stage;
    this.middlewares = Object.freeze(middlewares.slice());
  }

  match(position, stage) {
    return this.position === position && this.stage === stage;
  }
}

module.exports = OrmQueryMiddlewareGroup;
