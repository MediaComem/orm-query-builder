const { noop } = require('lodash');
const { spy, stub } = require('sinon');

const OrmQueryConfig = require('../lib/config');
const OrmQueryContext = require('../lib/context');
const OrmQueryExecutor = require('../lib/executor');
const { expect } = require('./utils/chai');

describe('builder', () => {

  const createAdapter = (query = {}, result = {}) => ({
    createQuery: stub().returns(query),
    executeQuery: stub().returns(result)
  });

  const createConfig = options => new OrmQueryConfig(options);
  const createExecutor = config => new OrmQueryExecutor(config);
  const createStrategy = stages => ({ getStages: () => stages, on: spy() });

  it('should create an executor', () => {
    const config = createConfig();
    const executor = createExecutor(config);
    expect(executor).to.be.an.instanceof(OrmQueryExecutor);
    expect(executor.config).to.equal(config);
    expect(executor.context).to.be.an.instanceof(OrmQueryContext);
  });

  it('should require a config', () => {
    expect(() => createExecutor()).to.throw('Config is required');
  });

  describe('execute', () => {
    it('should execute a query using an adapter', async () => {

      const mockQuery = {};
      const mockResult = {};

      const adapter = createAdapter(mockQuery, mockResult);
      const executor = createExecutor(createConfig({ adapter }));

      const result = await executor.execute();
      expect(result).to.equal(mockResult);

      expect(adapter.createQuery).to.have.been.calledWith(executor.context);
      expect(adapter.executeQuery).to.have.been.calledWith(mockQuery, executor.context);
      expect(adapter.executeQuery).to.have.been.calledImmediatelyAfter(adapter.createQuery);
    });

    it('should require a query from the adapter', async () => {

      const adapter = createAdapter(null, {});
      const executor = createExecutor(createConfig({ adapter }));

      await expect(executor.execute()).to.eventually.be.rejectedWith('Adapter\'s "createQuery" function must return a query');
    });

    describe('strategy', () => {
      it('should execute a query using a strategy', async () => {

        const mockQuery = {};
        const mockResult = {};
        const adapter = createAdapter(mockQuery, mockResult);
        const strategy = createStrategy([ 'foo', 'bar' ]);
        const executor = createExecutor(createConfig({ adapter, strategy }));

        const result = await executor.execute();
        expect(result).to.equal(mockResult);

        expect(adapter.createQuery).to.have.been.calledWith(executor.context);

        expect(strategy.on).to.have.been.calledWith('foo', executor.context)
                           .subsequently.calledWith('bar', executor.context);
        expect(strategy.on).to.have.been.calledAfter(adapter.createQuery);

        expect(adapter.executeQuery).to.have.been.calledWith(mockQuery, executor.context);
        expect(adapter.executeQuery).to.have.been.calledAfter(strategy.on);
      });

      it('should requires a stages array from a strategy', async () => {

        const adapter = createAdapter();
        const strategy = createStrategy('foo');
        const executor = createExecutor(createConfig({ adapter, strategy }));

        await expect(executor.execute()).to.eventually.be.rejectedWith('Stages must be an array, got string');
      });

      it('should require all stages to be strings', async () => {

        const adapter = createAdapter();
        const strategy = createStrategy([ 'foo', 42, 'bar' ]);
        const executor = createExecutor(createConfig({ adapter, strategy }));

        await expect(executor.execute()).to.eventually.be.rejectedWith('Stages must be an array of strings, got [string,number,string]');
      });

      it('should not accept duplicate stages', async () => {

        const adapter = createAdapter();
        const strategy = createStrategy([ 'foo', 'bar', 'foo' ]);
        const executor = createExecutor(createConfig({ adapter, strategy }));

        await expect(executor.execute()).to.eventually.be.rejectedWith('Stages must have no duplicates');
      });

      it('should not accept reserved stages', async () => {

        const adapter = createAdapter();
        const strategy = createStrategy([ 'foo', 'start', 'bar' ]);
        const executor = createExecutor(createConfig({ adapter, strategy }));

        await expect(executor.execute()).to.eventually.be.rejectedWith('Stages must not be end, query, start');
      });
    });
  });
});
