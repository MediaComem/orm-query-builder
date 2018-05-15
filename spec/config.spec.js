const bookshelfAdapter = require('../lib/adapters/bookshelf');
const OrmQueryConfig = require('../lib/config');
const { expect } = require('./utils/chai');

describe('config', () => {

  const createConfig = options => new OrmQueryConfig(options);

  it('should create a config with no options', () => {
    const config = createConfig();
    expect(config).to.be.an.instanceof(OrmQueryConfig);
  });

  it('should create one of the provided adapters by name', () => {
    const config = createConfig({ adapter: 'bookshelf' });
    expect(config.adapter).to.equal(bookshelfAdapter);
  });

  it('should not accept an unknown adapter name', () => {
    expect(() => createConfig({ adapter: 'foo' })).to.throw('Unknown adapter "foo"');
  });
});
