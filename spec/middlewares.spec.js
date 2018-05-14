const { expect } = require('chai');

const { before, OrmQueryBuilder, sorting } = require('../');
const { bookshelf, cleanUp, db, setUp } = require('./utils/db');
const { create, Person } = require('./utils/fixtures');

setUp();

describe('middlewares', () => {
  beforeEach(cleanUp);

  it('should be able to modify the query', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const req = { query: {} };
    const result = await new OrmQueryBuilder({ baseQuery: Person })
      .before('end', context => context.get('query').query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc')))
      .execute({ req });

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(3);

    const json = result.toJSON();
    expect(json).to.deep.include(people[2].toJSON());
    expect(json).to.deep.include(people[0].toJSON());
    expect(json).to.deep.include(people[1].toJSON());
  });

  it('should be able to modify the result', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .after('end', context => context.set('result', context.get('result').pluck('first_name').join('-')))
      .execute();

    expect(result).to.equal('Jane-John-Bob');
  });

  // TODO: test parallelism
});
