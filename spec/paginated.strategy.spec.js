const { expect } = require('chai');
const { spy } = require('sinon');

const { after, OrmQueryBuilder, wrap } = require('../');
const { bookshelf, cleanUp, db, setUp } = require('./fixtures/db');
const { createPerson, Person } = require('./fixtures/people');

setUp();

describe('orm-query-builder', () => {
  beforeEach(cleanUp);

  describe('paginated strategy', () => {

    it('should paginate', async () => {

      const people = await Promise.all([
        createPerson({ first_name: 'John', last_name: 'Doe' }),
        createPerson({ first_name: 'Jane', last_name: 'Doe' }),
        createPerson({ first_name: 'Bob', last_name: 'Smith' })
      ]);

      const req = { query: { offset: 0, limit: 2 } };
      const result = await new OrmQueryBuilder({ baseQuery: Person, strategy: 'paginated' })
        .modifiers(after('paginate'), context => context.wrap(context.query.query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc'))))
        .serializers(context => {
          expect(context.pagination.total).to.equal(3);
          expect(context.pagination.filteredTotal).to.equal(3);
          return context.result;
        })
        .execute({ req });

      expect(result).to.be.an.instanceof(bookshelf.Collection);
      expect(result).to.have.lengthOf(2);

      const json = result.toJSON();
      expect(json).to.deep.include(people[0].toJSON());
      expect(json).to.deep.include(people[2].toJSON());
    });
  });
});
