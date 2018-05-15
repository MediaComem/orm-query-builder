const { noop } = require('lodash');

const OrmQueryMiddlewareGroup = require('../lib/middleware-group');
const { expect } = require('./utils/chai');
const { setUp } = require('./utils/db');

setUp();

describe('middleware group', () => {

  let position, stage, middlewares;
  beforeEach(() => {
    position = 'before';
    stage = 'end';
    middlewares = [ noop, { execute: noop } ];
  });

  const createGroup = (pos, sta, mid) => new OrmQueryMiddlewareGroup(pos, sta, mid);

  it('should create a middleware group', () => {
    const group = createGroup(position, stage, middlewares);
    expect(group.position).to.equal(position);
    expect(group.stage).to.equal(stage);
    expect(group.middlewares).to.eql(middlewares);
  });

  it('should not accept an invalid position', () => {
    expect(() => createGroup(null, stage, middlewares)).to.throw('Middleware group position must be "before" or "after"; got object');
    expect(() => createGroup(24, stage, middlewares)).to.throw('Middleware group position must be "before" or "after"; got number');
    expect(() => createGroup('foo', stage, middlewares)).to.throw('Middleware group position must be "before" or "after"; got "foo"');
  });

  it('should not accept a stage that is not a string', () => {
    expect(() => createGroup(position, null, middlewares)).to.throw('Middleware group stage must be a string, got object');
    expect(() => createGroup(position, 42, middlewares)).to.throw('Middleware group stage must be a string, got number');
    expect(() => createGroup(position, true, middlewares)).to.throw('Middleware group stage must be a string, got boolean');
  });

  it('should not accept middlewares that are not an array', () => {
    expect(() => createGroup(position, stage, null)).to.throw('Middleware group middlewares must be an array, got object');
    expect(() => createGroup(position, stage, 66)).to.throw('Middleware group middlewares must be an array, got number');
    expect(() => createGroup(position, stage, false)).to.throw('Middleware group middlewares must be an array, got boolean');
  });

  it('should not accept an empty middlewares array', () => {
    expect(() => createGroup(position, stage, [])).to.throw('Middleware group middlewares must contain at least one middleware');
  });

  it('should not accept invalid middleware', () => {
    expect(() => createGroup(position, stage, [ 'foo' ])).to.throw('Middleware group middlewares must be functions or have an "execute" property that is a function')
    expect(() => createGroup(position, stage, [ { execute: 'bar' } ])).to.throw('Middleware group middlewares must be functions or have an "execute" property that is a function')
  });
});
