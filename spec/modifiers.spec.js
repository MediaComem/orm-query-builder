const { expect } = require('chai');

const { before, OrmQueryBuilder, sorting, wrap } = require('../');
const { bookshelf, cleanUp, db, setUp } = require('./fixtures/db');
const { createPerson, Person } = require('./fixtures/people');

setUp();

describe('modifiers', () => {
  beforeEach(cleanUp);

  it('should modify the query', async () => {

    const people = await Promise.all([
      createPerson({ first_name: 'John', last_name: 'Doe' }),
      createPerson({ first_name: 'Jane', last_name: 'Doe' }),
      createPerson({ first_name: 'Bob', last_name: 'Smith' })
    ]);

    const req = { query: {} };
    const result = await new OrmQueryBuilder({ baseQuery: Person })
      .modifiers(before('query'), context => context.wrap(context.query.query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc'))))
      .execute({ req });

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(3);

    const json = result.toJSON();
    expect(json).to.deep.include(people[2].toJSON());
    expect(json).to.deep.include(people[0].toJSON());
    expect(json).to.deep.include(people[1].toJSON());
  });
});
