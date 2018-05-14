const { spy, stub } = require('sinon');

const { OrmQueryConfig } = require('../../');
const adapter = require('../../lib/adapters/bookshelf');
const { expect } = require('../utils/chai');
const { bookshelf, setUp } = require('../utils/db');
const { Person } = require('../utils/fixtures');

setUp();

describe('bookshelf adapter', () => {

  const createConfig = options => new OrmQueryConfig(options);
  const createModel = options => bookshelf.Model.extend(options);

  describe('applyJoinDefinition', () => {

    function createQueryBuilder(...joinTypes) {
      return joinTypes.reduce((memo, type) => ({ ...memo, [type]: spy() }), {})
    }

    function createQuery(queryBuilder) {
      const query = new Person();
      stub(query, 'query').callsArgWith(0, queryBuilder);
      return query;
    }

    it('should apply an inner join', () => {

      const context = {};
      const qb = createQueryBuilder('innerJoin');
      const query = createQuery(qb);
      const join = {
        column: 'foo',
        joinColumn: 'bar',
        joinTable: 'baz',
        name: 'baz'
      };

      adapter.applyJoinDefinition(query, join, context);

      expect(qb.innerJoin).to.have.been.calledWithExactly('baz', 'foo', 'bar');
      expect(qb.innerJoin).to.have.callCount(1);
    });

    it('should apply a join with a table alias', () => {

      const context = {};
      const qb = createQueryBuilder('innerJoin');
      const query = createQuery(qb);
      const join = {
        column: 'foo',
        joinColumn: 'bar',
        joinTable: 'baz',
        name: 'qux'
      };

      adapter.applyJoinDefinition(query, join, context);

      expect(qb.innerJoin).to.have.been.calledWithExactly('baz as qux', 'foo', 'bar');
      expect(qb.innerJoin).to.have.callCount(1);
    });

    it('should apply a join of a specific type', () => {

      const context = {};
      const qb = createQueryBuilder('leftOuterJoin');
      const query = createQuery(qb);
      const join = {
        column: 'foo',
        joinColumn: 'bar',
        joinTable: 'baz',
        joinType: 'leftOuterJoin',
        name: 'baz'
      };

      adapter.applyJoinDefinition(query, join, context);

      expect(qb.leftOuterJoin).to.have.been.calledWithExactly('baz', 'foo', 'bar');
      expect(qb.leftOuterJoin).to.have.callCount(1);
    });

    it('should not accept an unsupported join type', () => {

      const context = {};
      const qb = createQueryBuilder('innerJoin');
      const query = createQuery(qb);
      const join = {
        column: 'foo',
        joinColumn: 'bar',
        joinTable: 'baz',
        joinType: 'foo',
        name: 'baz'
      };

      expect(() => adapter.applyJoinDefinition(query, join, context)).to.throw('Join type "foo" is not supported by this adapter');
    });
  });

  describe('createQuery', () => {
    it('should create a query from a model', () => {
      const query = adapter.createQuery({ options: { baseQuery: Person } });
      expect(query).to.be.an.instanceof(Person);
    });

    it('should use the provided query', () => {
      const baseQuery = new Person();
      const query = adapter.createQuery({ options: { baseQuery } });
      expect(query).to.equal(baseQuery);
    });
  });

  describe('getJoinDefinitions', () => {
    it('should parse a belongsTo definition', () => {

      const fooModel = createModel({ tableName: 'foo' });

      const barModel = createModel({
        tableName: 'bar',
        foo: function() {
          return this.belongsTo(fooModel);
        }
      });

      expect(adapter.getJoinDefinitions(barModel, 'foo', undefined, createConfig())).to.eql([
        {
          column: 'bar.foo_id',
          joinColumn: 'foo.id',
          joinTable: 'foo',
          joinType: undefined,
          name: 'foo'
        }
      ]);
    });

    it('should parse a belongsToMany definition', () => {

      const fooModel = createModel({ tableName: 'foo' });

      const barModel = createModel({
        tableName: 'bar',
        foo: function() {
          return this.belongsToMany(fooModel);
        }
      });

      expect(adapter.getJoinDefinitions(barModel, 'foo', undefined, createConfig())).to.eql([
        {
          column: 'bar.id',
          joinColumn: 'bar_foo.bar_id',
          joinTable: 'bar_foo',
          joinType: undefined,
          name: 'bar_foo'
        },
        {
          column: 'bar_foo.foo_id',
          joinColumn: 'foo.id',
          joinTable: 'foo',
          joinType: undefined,
          name: 'foo',
          requiredJoin: 'bar_foo'
        }
      ]);
    });

    it('should parse a hasMany definition', () => {

      const fooModel = createModel({ tableName: 'foo' });

      const barModel = createModel({
        tableName: 'bar',
        foo: function() {
          return this.hasMany(fooModel);
        }
      });

      expect(adapter.getJoinDefinitions(barModel, 'foo', undefined, createConfig())).to.eql([
        {
          column: 'bar.id',
          joinColumn: 'foo.bar_id',
          joinTable: 'foo',
          joinType: undefined,
          name: 'foo'
        }
      ]);
    });

    it('should parse a hasOne definition', () => {

      const fooModel = createModel({ tableName: 'foo' });

      const barModel = createModel({
        tableName: 'bar',
        foo: function() {
          return this.hasOne(fooModel);
        }
      });

      expect(adapter.getJoinDefinitions(barModel, 'foo', undefined, createConfig())).to.eql([
        {
          column: 'bar.id',
          joinColumn: 'foo.bar_id',
          joinTable: 'foo',
          joinType: undefined,
          name: 'foo'
        }
      ]);
    });

    it('should not accept a non-string relation', () => {
      expect(() => adapter.getJoinDefinitions(Person, 42, {}, createConfig())).to.throw('Relation must be a string, got number');
    });

    it('should not accept a relation that does not exist on the model', () => {
      expect(() => adapter.getJoinDefinitions(Person, 'foo', {}, createConfig())).to.throw('Model has no relation "foo"');
    });

    it('should not accept a method of the model that is not a relation', () => {
      const model = createModel({ tableName: 'test', foo: () => 'bar' });
      expect(() => adapter.getJoinDefinitions(model, 'foo', {}, createConfig())).to.throw('Model method "foo" is not a relation');
    });

    it('should not accept an unsupported bookshelf relation type', () => {
      const model = createModel({ tableName: 'test', foo: () => ({ relatedData: { type: 'foo' } }) });
      expect(() => adapter.getJoinDefinitions(model, 'foo', {}, createConfig())).to.throw('Unsupported bookshelf relation type "foo"');
    });
  });

});
