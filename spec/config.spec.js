const OrmQueryConfig = require('../lib/config');
const { expect } = require('./utils/chai');

describe('builder', () => {

  const createConfig = options => new OrmQueryConfig(options);

  it('should create a config with no options', () => {
    const config = createConfig();
    expect(config).to.be.an.instanceof(OrmQueryConfig);
  });

  it('should not accept an unknown adapter name', () => {
    expect(() => createConfig({ adapter: 'foo' })).to.throw('Unknown adapter "foo"');
  });
});
