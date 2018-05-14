const { OrmQueryWrapper } = require('../');
const { expect } = require('./utils/chai');
const { setUp } = require('./utils/db');

setUp();

describe('wrapper', () => {
  it('should not accept a falsy query', () => {
    expect(() => new OrmQueryWrapper()).to.throw('Query is required');
  });

  it('should not accept an already wrapped query', () => {
    const wrapper = new OrmQueryWrapper('foo');
    expect(() => new OrmQueryWrapper(wrapper)).to.throw('Query is already wrapped');
  });

  it('should not re-wrap an already wrapped query', () => {
    const wrapper = new OrmQueryWrapper('bar');
    expect(OrmQueryWrapper.wrap(wrapper)).to.equal(wrapper);
  });

  it('should not unwrap an already unwrapped query', () => {
    const query = 'baz';
    expect(OrmQueryWrapper.unwrap(query)).to.equal(query);
  });
});
