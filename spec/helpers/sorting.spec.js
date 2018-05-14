const { expect } = require('chai');

const { before, OrmQueryBuilder, sorting } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../utils/db');
const { create, Person } = require('../utils/fixtures');

setUp();

describe('sorting helper', () => {

  let builder, people;
  beforeEach(async () => {
    await cleanUp();

    people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    builder = await new OrmQueryBuilder({ baseQuery: Person })
      .use(sorting().sorts('lastName', 'firstName').default('lastName-desc', 'firstName-desc'));
  });

  function expectResult(result, ...personIndices) {
    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(personIndices.length);
    expect(result.toJSON()).to.eql(personIndices.map(i => people[i].toJSON()));
  }

  it('should apply the default sort', async () => {
    const req = { query: {} };
    const result = await builder.execute({ req });
    expectResult(result, 2, 0, 1);
  });

  it('should sort by a single criterion', async () => {
    const req = { query: { sort: 'firstName' } };
    const result = await builder.execute({ req });
    expectResult(result, 2, 1, 0);
  });

  it('should sort by a single criterion in descending order', async () => {
    const req = { query: { sort: 'firstName-desc' } };
    const result = await builder.execute({ req });
    expectResult(result, 0, 1, 2);
  });

  it('should sort by multiple criteria', async () => {
    const req = { query: { sort: [ 'lastName', 'firstName' ] } };
    const result = await builder.execute({ req });
    expectResult(result, 1, 0, 2);
  });

  it('should sort by multiple criteria in descending order', async () => {
    const req = { query: { sort: [ 'lastName-desc', 'firstName' ] } };
    const result = await builder.execute({ req });
    expectResult(result, 2, 1, 0);
  });
});
