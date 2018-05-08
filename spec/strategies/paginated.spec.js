const { expect } = require('chai');
const { spy } = require('sinon');

const { OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../fixtures/db');
const { createPerson, Person } = require('../fixtures/people');

setUp();

describe('paginated strategy', () => {
  beforeEach(cleanUp);

  it('should paginate', async () => {

    const people = await Promise.all([
      createPerson({ first_name: 'John', last_name: 'Doe' }),
      createPerson({ first_name: 'Jane', last_name: 'Doe' }),
      createPerson({ first_name: 'Bob', last_name: 'Smith' })
    ]);

    const req = { query: { offset: 0, limit: 2 } };
    const baseQuery = new Person().query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc'));
    const context = await new OrmQueryBuilder({ baseQuery, strategy: 'paginated' })
      .execute({ req, result: 'context' });

    expect(context).to.be.an('object');
    expect(context.pagination.total).to.equal(3);
    expect(context.pagination.filteredTotal).to.equal(3);

    const result = context.result;
    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(2);

    const json = result.toJSON();
    expect(json).to.deep.include(people[0].toJSON());
    expect(json).to.deep.include(people[2].toJSON());
  });
});
