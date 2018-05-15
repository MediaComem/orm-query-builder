const { expect } = require('chai');
const { identity, noop } = require('lodash');

const { before, OrmQueryBuilder, sorting } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../utils/db');
const { create, Person } = require('../utils/fixtures');

setUp();

describe('sorting plugin', () => {

  describe('sort', () => {
    it('should not allow defining the same sort twice', () => {
      const plugin = sorting();
      plugin.sort('foo', noop);
      expect(() => plugin.sort('foo', noop)).to.throw('Sort "foo" is already defined');
    });
  });

  describe('sorts', () => {
    it('should not allow defining sorts of unsupported types', () => {
      const plugin = sorting();
      expect(() => plugin.sorts(null)).to.throw('Unsupported sort type object');
      expect(() => plugin.sorts(42)).to.throw('Unsupported sort type number');
      expect(() => plugin.sorts(true)).to.throw('Unsupported sort type boolean');
    });
  });

  describe('default', () => {
    it('should define the default sorts as strings', () => {

      const plugin = sorting();
      plugin.sort('foo', noop);
      plugin.sort('bar', noop);
      plugin.sort('baz', noop);

      plugin.default('foo-desc', 'bar');
      expect(plugin.defaultSort).to.eql([
        { name: 'foo', direction: 'desc' },
        { name: 'bar', direction: 'asc' }
      ])
    });

    it('should define the default sorts as objects', () => {

      const plugin = sorting();
      plugin.sort('foo', noop);
      plugin.sort('bar', noop);
      plugin.sort('baz', noop);

      plugin.default({ name: 'foo', direction: 'asc' }, { name: 'baz', direction: 'desc' }, { name: 'bar' });
      expect(plugin.defaultSort).to.eql([
        { name: 'foo', direction: 'asc' },
        { name: 'baz', direction: 'desc' },
        { name: 'bar', direction: 'asc' }
      ])
    });

    it('should not accept an invalid default sort', () => {
      const plugin = sorting();
      plugin.sort('foo', noop);
      expect(() => plugin.default(66)).to.throw('Unsupported default sort type number');
    });

    it('should not accept an undefined sort', () => {
      const plugin = sorting();
      plugin.sort('foo', noop);
      expect(() => plugin.default('bar')).to.throw('Undefined sort "bar"');
    });

    it('should not accept unknown sort directions', () => {
      const plugin = sorting();
      plugin.sort('foo', noop);
      expect(() => plugin.default('foo-right')).to.throw('Unsupported sort order "right" for sort "foo"');
      expect(() => plugin.default({ name: 'foo', direction: 'left' })).to.throw('Unsupported sort order "left" for sort "foo"');
    });
  });

  describe('configured', () => {

    let people;
    beforeEach(async () => {
      await cleanUp();

      people = await create(Person,
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Doe' },
        { first_name: 'Bob', last_name: 'Smith' }
      );
    });

    function createBuilder(enrichPlugin = identity) {
      return new OrmQueryBuilder({ baseQuery: Person })
        .use(enrichPlugin(sorting().sorts('lastName', 'firstName')));
    }

    function expectResult(result, ...personIndices) {
      expect(result).to.be.an.instanceof(bookshelf.Collection);
      expect(result).to.have.lengthOf(personIndices.length);
      expect(result.toJSON()).to.eql(personIndices.map(i => people[i].toJSON()));
    }

    it('should sort by a single criterion', async () => {
      const req = { query: { sort: 'firstName' } };
      const builder = createBuilder();
      const result = await builder.execute({ req });
      expectResult(result, 2, 1, 0);
    });

    it('should sort by a single criterion in descending order', async () => {
      const req = { query: { sort: 'firstName-desc' } };
      const builder = createBuilder();
      const result = await builder.execute({ req });
      expectResult(result, 0, 1, 2);
    });

    it('should sort by multiple criteria', async () => {
      const req = { query: { sort: [ 'lastName', 'firstName' ] } };
      const builder = createBuilder();
      const result = await builder.execute({ req });
      expectResult(result, 1, 0, 2);
    });

    it('should sort by multiple criteria in descending order', async () => {
      const req = { query: { sort: [ 'lastName-desc', 'firstName' ] } };
      const builder = createBuilder();
      const result = await builder.execute({ req });
      expectResult(result, 2, 1, 0);
    });

    it('should apply the default sort', async () => {
      const req = { query: {} };
      const builder = createBuilder(plugin => plugin.default('lastName-desc', 'firstName-desc'));
      const result = await builder.execute({ req });
      expectResult(result, 2, 0, 1);
    });

    it('should complete the sorting criteria with the default sort', async () => {
      const req = { query: { sort: 'lastName-asc' } };
      const builder = createBuilder(plugin => plugin.default('lastName-desc', 'firstName-desc'));
      const result = await builder.execute({ req });
      expectResult(result, 0, 1, 2);
    });

    it('should not apply the default sort if all sorts are already defined', async () => {
      const req = { query: { sort: [ 'lastName-asc', 'firstName-asc' ] } };
      const builder = createBuilder(plugin => plugin.default('lastName-desc', 'firstName-desc'));
      const result = await builder.execute({ req });
      expectResult(result, 1, 0, 2);
    });
  });
});
