const { noop } = require('lodash');
const { spy, stub } = require('sinon');

const OrmQueryConfig = require('../lib/config');
const OrmQueryContext = require('../lib/context');
const OrmQueryExecutor = require('../lib/executor');
const { expect } = require('./utils/chai');

describe('executor', () => {

  const createAdapter = (query = {}, result = {}) => ({
    createQuery: stub().returns(query),
    executeQuery: stub().returns(result)
  });

  const createConfig = options => new OrmQueryConfig(options);
  const createExecutor = config => new OrmQueryExecutor(config);

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

  describe('stages', () => {

    let config;
    beforeEach(() => {
      config = createConfig({ adapter: createAdapter() });
    });

    function setStages(...stages) {
      config.addMiddlewareGroup('after', 'start', [ context => context.setStages(stages) ]);
    }

    it('should not accept non-string stages', async () => {
      setStages(42, 'end');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage must be a string, got number');
    });

    it('should not accept undefined stages', async () => {
      setStages(undefined, 'end');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage cannot be undefined');
    });

    it('should not accept no stages', async () => {
      const executor = createExecutor(config);
      executor.context.setStages([]);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage "start" must be the first stage, but no stages are defined');
    });

    it('should not accept a last stage that is not "end"', async () => {
      setStages('foo', 'bar');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Last stage must be "end", got "bar"');
    });

    it('should not accept an empty string as a stage', async () => {
      setStages('foo', '', 'end');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage cannot be a blank string');
    });

    it('should not accept a blank string as a stage', async () => {
      setStages('foo', '   ', 'end');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage cannot be a blank string');
    });

    it('should not accept a first stage that is not "start"', async () => {
      const executor = createExecutor(config);
      executor.context.setStages([ 'foo', 'end' ]);
      await expect(executor.execute()).to.eventually.be.rejectedWith('First stage must be "start", got "foo"');
    });

    it('should not accept any stage after the "end" stage', async () => {
      setStages('foo', 'end', 'bar');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage "bar" cannot be after "end" stage');
    });

    it('should not accept duplicate stages', async () => {
      setStages('foo', 'bar', 'foo', 'end');
      const executor = createExecutor(config);
      await expect(executor.execute()).to.eventually.be.rejectedWith('Stage "foo" was already triggered (previous stages were: start, foo, bar)');
    });
  });
});
