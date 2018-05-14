const { expect } = require('chai');
const { spy } = require('sinon');

const { OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../utils/db');
const { create, Person } = require('../utils/fixtures');

setUp();

describe('paginated strategy', () => {
  beforeEach(cleanUp);

  it('should paginate', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const req = { query: { offset: 0, limit: 2 } };
    const baseQuery = new Person().query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc'));
    const context = await new OrmQueryBuilder({ baseQuery, strategy: 'paginated' })
      .execute({ req, result: 'context' });

    expect(context).to.be.an('object');
    expect(context.get('pagination')).to.eql({
      filteredTotal: 3,
      limit: 2,
      offset: 0,
      total: 3
    });

    const result = context.get('result');
    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(2);

    const json = result.toJSON();
    expect(json).to.deep.include(people[0].toJSON());
    expect(json).to.deep.include(people[2].toJSON());
  });

  it('should paginate with filters', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const req = { query: { offset: 1, limit: 1 } };
    const baseQuery = new Person().query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc'));
    const context = await new OrmQueryBuilder({ baseQuery, strategy: 'paginated' })
      .before('paginate', context => context.set('query', context.get('query').query(qb => qb.where('last_name', 'Doe'))))
      .execute({ req, result: 'context' });

    expect(context).to.be.an('object');
    expect(context.get('pagination')).to.eql({
      filteredTotal: 2,
      limit: 1,
      offset: 1,
      total: 3
    });

    const result = context.get('result');
    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(1);

    const json = result.toJSON();
    expect(json).to.deep.include(people[1].toJSON());
  });

  it('should paginate with default settings', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const req = { query: {} };
    const baseQuery = new Person().query(qb => qb.orderBy('last_name', 'desc').orderBy('first_name', 'desc'));
    const context = await new OrmQueryBuilder({ baseQuery, strategy: 'paginated' })
      .execute({ req, result: 'context' });

    expect(context).to.be.an('object');
    expect(context.get('pagination')).to.eql({
      filteredTotal: 3,
      limit: 100,
      offset: 0,
      total: 3
    });

    const result = context.get('result');
    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(3);
    expect(result.toJSON()).to.eql([ 2, 0, 1 ].map(i => people[i].toJSON()));
  });
});
