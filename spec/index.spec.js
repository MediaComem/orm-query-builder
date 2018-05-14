const { expect } = require('chai');

const { OrmQueryBuilder } = require('../');
const { bookshelf, cleanUp, db, setUp } = require('./utils/db');
const { create, Person } = require('./utils/fixtures');

setUp();

describe('orm-query-builder', () => {
  beforeEach(cleanUp);

  it('should issue a simple query', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const result = await new OrmQueryBuilder({ baseQuery: Person }).execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result.models).to.have.lengthOf(3);

    const json = result.toJSON();
    expect(json).to.deep.include(people[0].toJSON());
    expect(json).to.deep.include(people[1].toJSON());
    expect(json).to.deep.include(people[2].toJSON());
  });
});
