const _ = require('lodash');

const OrmQueryWrapper = require('./wrapper');

const RESERVED_STAGES = [ 'end', 'query', 'start' ];

class OrmQueryExecutor {
  constructor(context) {
    this.context = context;
  }

  async execute(options = {}) {

    _.extend(this.context.options, options);

    const adapter = this.context.adapter;

    // Initialize the query.
    this.context.query = adapter.createQuery(this.context);

    // Emit the "start" stage.
    await this.emit('start', () => {
      this.context.stage = {};
    });

    const stages = this.context.strategy.getStages(this.context);
    if (!_.isArray(stages)) {
      throw new Error(`Stages must be an array, got ${typeof(stages)}`);
    } else if (stages.some(stage => typeof(stage) !== 'string')) {
      throw new Error(`Stages must be an array of strings, got [${stages.map(stage => typeof(stage)).join(',')}]`);
    } else if (_.uniq(stages).length !== stages.length) {
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
      this.context.result = await Promise.resolve(adapter.executeQuery(this.context));
    });

    return this.context.options.result === 'context' ? this.context : this.context.result;
  }

  async emit(event, callback = _.noop) {
    await this.runMiddlewares('before', event);
    await Promise.resolve(callback());
    await Promise.resolve(this.context.strategy.on(event, this.context));
    await this.runMiddlewares('after', event);
  }

  async runMiddlewares(position, stage) {

    const middlewareGroups = this.context.middlewareGroups.filter(group => group.predicate(position, stage));
    for (let group of middlewareGroups) {

      const middlewares = group.middlewares;
      await Promise.all(middlewares.map(async middleware => {
        const middlewareFunc = typeof(middleware.execute) === 'function' ? middleware.execute.bind(middleware) : middleware;
        await middlewareFunc(this.context);
      }));
    }
  }
}

module.exports = OrmQueryExecutor;
