const { expect } = require('chai');
const { spy } = require('sinon');

const { joining, OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../fixtures/db');
const { Book, createBook } = require('../fixtures/books');
const { createPerson, Person } = require('../fixtures/people');
const { createTheme, Theme } = require('../fixtures/themes');

setUp();

describe('joining helper', () => {
  beforeEach(cleanUp);

  it('should join tables', async () => {

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
      .use(
        joining('people')
          .join('books_people')
          .join('books', { joinKey: 'books_people.book_id', requiredJoin: 'books_people' })
      )
      .after('start', context => context.requireJoin('books'))
      .execute();
  });
});
