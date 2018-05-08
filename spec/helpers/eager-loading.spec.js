const { expect } = require('chai');
const { spy } = require('sinon');

const { eagerLoading, OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../fixtures/db');
const { Book, createBook } = require('../fixtures/books');
const { createPerson, Person } = require('../fixtures/people');
const { createTheme, Theme } = require('../fixtures/themes');

setUp();

describe('eager loading helper', () => {
  beforeEach(cleanUp);

  it('should eager load relations', async () => {

    const people = await Promise.all([
      createPerson({ first_name: 'John', last_name: 'Doe' }),
      createPerson({ first_name: 'Jane', last_name: 'Doe' }),
      createPerson({ first_name: 'Bob', last_name: 'Smith' })
    ]);

    const theme = await createTheme({ name: 'Query Building' });

    const books = await Promise.all([
      createBook({ title: 'Eager Loading', theme }),
      createBook({ title: 'Filtering', theme })
    ]);

    people[0].books().attach(books.slice(0, 1));
    people[1].books().attach(books.slice());

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .serializers(eagerLoading().load('books.theme'))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(3);
    expect(result.pluck('id')).to.eql([ 1, 0, 2 ].map(i => people[i].get('id')));

    const booksByJane = result.models[0].related('books');
    expect(booksByJane.pluck('title').sort()).to.eql([ 'Eager Loading', 'Filtering' ]);
    expect(booksByJane).to.have.lengthOf(2);

    const booksByJohn = result.models[1].related('books');
    expect(booksByJohn.pluck('title').sort()).to.eql([ 'Eager Loading' ]);
    expect(booksByJohn).to.have.lengthOf(1);

    const booksByBob = result.models[2].related('books');
    expect(booksByBob).to.have.lengthOf(0);

    for (let book of [ ...booksByJane.models, ...booksByJohn.models, ...booksByBob.models ]) {
      expect(book.related('theme').toJSON()).to.eql(theme.toJSON());
    }
  });
});
