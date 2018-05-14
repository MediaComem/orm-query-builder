const { extend, isArray, noop, uniq } = require('lodash');

const OrmQueryContext = require('./context');
const OrmQueryWrapper = require('./wrapper');

const RESERVED_STAGES = [ 'end', 'query', 'start' ];

class OrmQueryExecutor {
  constructor(config) {
    if (!config) {
      throw new Error('Config is required');
    }

    this.config = config;
    this.context = new OrmQueryContext(config, this);
  }

  async execute(options = {}) {

    extend(this.context.options, options);

    // Initialize the query.
    const query = this.context.adapter.createQuery(this.context);
    if (!query) {
      throw new Error('Adapter\'s "createQuery" function must return a query');
    }

    this.context.set('query', query);

    // Emit the "start" stage.
    await this.emit('start', () => {
      this.context.set('stage', {});
    });

    // Retrieve stages defined by the strategy.
    const stages = this.context.strategy.getStages(this.context);
    if (!isArray(stages)) {
      throw new Error(`Stages must be an array, got ${typeof(stages)}`);
    } else if (stages.some(stage => typeof(stage) !== 'string')) {
      throw new Error(`Stages must be an array of strings, got [${stages.map(stage => typeof(stage)).join(',')}]`);
    } else if (uniq(stages).length !== stages.length) {
      throw new Error('Stages must have no duplicates');
    } else if (RESERVED_STAGES.some(stage => stages.indexOf(stage) >= 0)) {
      throw new Error(`Stages must not be ${RESERVED_STAGES.join(', ')}`);
    }

    // Emit the stages defined by the strategy (if any).
    for (let stage of stages) {
      await this.emit(stage);
    }

    // Execute the query.
    await this.emit('end', async () => {
      this.context.set('result', await this.context.query());
    });

    return this.context.options.result === 'context' ? this.context : this.context.get('result');
  }

  async emit(event, callback = noop) {

    await this.runMiddlewares('before', event);

    const result = await Promise.resolve(callback());

    await Promise.resolve(this.context.strategy.on(event, this.context));

    await this.runMiddlewares('after', event);

    return result;
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
