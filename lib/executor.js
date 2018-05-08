const _ = require('lodash');

const OrmQueryWrapper = require('./wrapper');

class OrmQueryExecutor {
  constructor(context) {
    this.context = context;
  }

  async execute(options = {}) {

    _.extend(this.context.options, options);

    const adapter = this.context.adapter;

    // Initialize the query.
    this.context.query = adapter.createQuery(this.context);

    // Apply the query strategy (e.g. pagination).
    await this.context.strategy.apply(this.context, {
      before: async stage => {
        this.context.stage = {};
        await this.modifyQuery('before', stage);
      },
      after: async stage => {
        await this.modifyQuery('after', stage);
      }
    });

    // Apply remaining modifiers.
    this.context.stage = {};
    await this.modifyQuery('before', 'query');

    // Execute the query.
    this.context.result = await Promise.resolve(adapter.executeQuery(this.context));

    // Serialize the result.
    for (let serializerGroup of this.context.serializerGroups) {
      await Promise.all(serializerGroup.map(async serializer => {
        const serializeFunc = typeof(serializer.serialize) === 'function' ? serializer.serialize.bind(serializer) : serializer;
        const result = await serializeFunc(this.context);
        if (result) {
          this.context.result = result;
        }
      }));
    }

    return this.context.options.return === 'context' ? this.context : this.context.result;
  }

  async modifyQuery(position, stage) {

    const modifierGroups = this.context.modifierGroups.filter(group => group.predicate(position, stage));
    for (let group of modifierGroups) {

      const modifiers = group.modifiers;
      await Promise.all(modifiers.map(async modifier => {

        const modifyFunc = typeof(modifier.modify) === 'function' ? modifier.modify.bind(modifier) : modifier;
        const result = await modifyFunc(this.context);
        if (result) {
          this.context.stage.modified = true;
          this.context.query = OrmQueryWrapper.unwrap(result);
        }
      }));
    }
  }
}

module.exports = OrmQueryExecutor;
