const { extend, includes, isArray, last, noop, uniq } = require('lodash');

const OrmQueryContext = require('./context');
const OrmQueryWrapper = require('./wrapper');

const RESERVED_STAGES = [ 'end', 'query', 'start' ];

class OrmQueryExecutor {
  constructor(config) {
    if (!config) {
      throw new Error('Config is required');
    }

    this.config = config;

    // FIXME: make sure these middlewares are executed first
    this.config.addMiddlewareGroup('on', 'start', [ this.start.bind(this) ]);
    this.config.addMiddlewareGroup('on', 'end', [ this.end.bind(this) ]);

    this.context = new OrmQueryContext(config, this);
  }

  async execute(options = {}) {

    extend(this.context.options, options);

    let stages;
    const previousStages = [];

    do {
      stages = this.context.getStages();

      const nextStage = stages.shift();
      if (nextStage !== undefined && typeof(nextStage) !== 'string') {
        throw new Error(`Stage must be a string, got ${typeof(nextStage)}`);
      } else if (nextStage === undefined && stages.length) {
        throw new Error('Stage cannot be undefined');
      } else if (nextStage === undefined && !previousStages.length) {
        throw new Error('Stage "start" is missing');
      } else if (nextStage === undefined && last(previousStages) !== 'end') {
        throw new Error(`Last stage must be "end", got "${last(previousStages)}"`);
      } else if (nextStage === undefined) {
        break;
      } else if (!nextStage.trim().length) {
        throw new Error('Stage cannot be a blank string');
      } else if (!previousStages.length && nextStage !== 'start') {
        throw new Error(`First stage must be "start", got "${nextStage}"`);
      } else if (nextStage && last(previousStages) === 'end') {
        throw new Error(`Stage "${nextStage}" cannot be after "end" stage`);
      } else if (includes(previousStages, nextStage)) {
        throw new Error(`Stage "${nextStage}" was already triggered (previous stages were: ${previousStages.join(', ')})`);
      }

      await this.emit(nextStage);

      previousStages.push(nextStage);

    } while (stages.length);

    return this.context.options.result === 'context' ? this.context : this.context.get('result');
  }

  async emit(event, callback = noop) {

    this.context.set('stage', {});

    await this.runMiddlewares('before', event);

    const result = await Promise.resolve(callback());

    await this.runMiddlewares('on', event);

    await this.runMiddlewares('after', event);

    return result;
  }

  start() {

    // Initialize the query.
    const query = this.context.adapter.createQuery(this.context);
    if (!query) {
      throw new Error('Adapter\'s "createQuery" function must return a query');
    }

    this.context.set('query', query);
  }

  async end() {
    this.context.set('result', await this.context.query());
  }

  async runMiddlewares(position, stage) {

    for (let group of this.config.middlewareGroups) {
      if (!group.match(position, stage)) {
        continue;
      }

      const middlewares = group.middlewares;
      await Promise.all(middlewares.map(middleware => executeMiddleware(middleware, this.context)));
    }
  }
}

function executeMiddleware(middleware, ...args) {
  return typeof(middleware.execute) === 'function' ? middleware.execute(...args) : middleware(...args);
}

module.exports = OrmQueryExecutor;
