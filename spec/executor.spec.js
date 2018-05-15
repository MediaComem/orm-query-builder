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
  });
});
