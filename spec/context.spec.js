const OrmQueryConfig = require('../lib/config');
const OrmQueryContext = require('../lib/context');
const { expect } = require('./utils/chai');

describe('context', () => {

  const createConfig = options => new OrmQueryConfig(options);
  const createContext = (config = createConfig(), executor = {}) => new OrmQueryContext(config, executor);

  it('should create an initial context', () => {
    const config = createConfig();
    const executor = {};
    const context = createContext(config, executor);
    expect(context.config).to.equal(config);
    expect(context.executor).to.equal(executor);
    expect(context.options).to.eql(config.options);
    expect(context.options).not.to.equal(config.options);
    expect(context.stages).to.eql([ 'start', 'end' ]);
    expect(context.state).to.eql({});
  });

  it('should not accept stages that are not an array', () => {
    const context = createContext();
    expect(() => context.setStages('foo')).to.throw('Stages must be an array, got string');
  });
});
