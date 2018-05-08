const { expect } = require('chai');

const { before, OrmQueryBuilder, sorting, wrap } = require('../');
const { bookshelf, cleanUp, db, setUp } = require('./fixtures/db');
const { createPerson, Person } = require('./fixtures/people');

setUp();

describe('serializers', () => {
  beforeEach(cleanUp);

  it('should serialize the result', async () => {

    const people = await Promise.all([
      createPerson({ first_name: 'John', last_name: 'Doe' }),
      createPerson({ first_name: 'Jane', last_name: 'Doe' }),
      createPerson({ first_name: 'Bob', last_name: 'Smith' })
    ]);

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .serializers(context => context.result.pluck('first_name'))
      .serializers(context => context.result.join('-'))
      .execute();

    expect(result).to.equal('Jane-John-Bob');
  });
});
