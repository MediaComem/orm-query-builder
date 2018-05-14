const { noop, times } = require('lodash');
const { spy, stub } = require('sinon');

const { OrmQueryBuilder, OrmQueryConfig } = require('../');
const { expect } = require('./utils/chai');

describe('builder', () => {

  const createBuilder = options => new OrmQueryBuilder(options);

  it('should create a config with the provided options', () => {
    const options = { foo: 'bar' };
    const builder = createBuilder(options);
    expect(builder.config).to.be.an.instanceof(OrmQueryConfig);
    expect(builder.config.options).to.equal(options);
  });

  it('should use the provided config', () => {
    const config = new OrmQueryConfig({ bar: 'baz' });
    const builder = createBuilder(config);
    expect(builder.config).to.equal(config);
  });

  describe('middlewares', () => {
    it('should add middlewares before a stage', () => {

      const config = new OrmQueryConfig();
      stub(config, 'addMiddlewareGroup');
      const builder = createBuilder(config);

      const groups = [
        [ noop, noop ],
        [ noop ]
      ];

      builder.before('foo', ...groups[0]);
      expect(config.addMiddlewareGroup).to.have.been.calledWith('before', 'foo', groups[0]);
      expect(config.addMiddlewareGroup).to.have.callCount(1);

      builder.before('bar', ...groups[1]);
      expect(config.addMiddlewareGroup).to.have.been.calledWith('before', 'bar', groups[1]);
      expect(config.addMiddlewareGroup).to.have.callCount(2);
    });

    it('should add middlewares after a stage', () => {

      const config = new OrmQueryConfig();
      stub(config, 'addMiddlewareGroup');
      const builder = createBuilder(config);

      const groups = [
        [ noop, noop, noop ],
        [ noop, noop ]
      ];

      builder.after('foo', ...groups[0]);
      expect(config.addMiddlewareGroup).to.have.been.calledWith('after', 'foo', groups[0]);
      expect(config.addMiddlewareGroup).to.have.callCount(1);

      builder.after('bar', ...groups[1]);
      expect(config.addMiddlewareGroup).to.have.been.calledWith('after', 'bar', groups[1]);
      expect(config.addMiddlewareGroup).to.have.callCount(2);
    });

    it('should add middlewares after a stage with "on"', () => {

      const config = new OrmQueryConfig();
      stub(config, 'addMiddlewareGroup');
      const builder = createBuilder(config);

      const groups = [
        [ noop, noop, noop ],
        [ noop, noop ]
      ];

      builder.on('foo', ...groups[0]);
      expect(config.addMiddlewareGroup).to.have.been.calledWith('after', 'foo', groups[0]);
      expect(config.addMiddlewareGroup).to.have.callCount(1);

      builder.on('bar', ...groups[1]);
      expect(config.addMiddlewareGroup).to.have.been.calledWith('after', 'bar', groups[1]);
      expect(config.addMiddlewareGroup).to.have.callCount(2);
    });
  });

  describe('plugins', () => {
    it('should call plugins synchronously and in order', () => {

      const builder = createBuilder();
      const middlewares = times(3, () => ({ use: spy() }));
      builder.use(...middlewares);

      middlewares.forEach(middleware => expect(middleware.use).to.have.been.calledWith(builder));
      times(2, i => expect(middlewares[i + 1].use).to.have.been.calledImmediatelyAfter(middlewares[i].use));
    });

    it('should not accept plugins without a use function', () => {
      const builder = createBuilder();
      const invalidPlugin = function() {};
      expect(() => builder.use(invalidPlugin)).to.throw('Plugin must have a "use" function');
    });
  });

  describe('clone', () => {

    const clonedConfig = new OrmQueryConfig();
    const config = new OrmQueryConfig();
    stub(config, 'clone').returns(clonedConfig);
    const builder = createBuilder(config);

    const clonedBuilder = builder.clone();
    expect(clonedBuilder).to.be.an.instanceof(OrmQueryBuilder);
    expect(clonedBuilder).not.to.equal(builder);
    expect(clonedBuilder.config).to.equal(clonedConfig);
  });
});
