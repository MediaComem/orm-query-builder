const { expect } = require('chai');
const { spy } = require('sinon');

const { joining, OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../fixtures/db');
const { Book, createBook } = require('../fixtures/books');
const { createPerson, Person } = require('../fixtures/people');
const { createTheme, Theme } = require('../fixtures/themes');

setUp();

describe('joining helper', () => {

  let books, people, themes;
  beforeEach(async () => {
    await cleanUp();

    people = await Promise.all([
      createPerson({ first_name: 'John', last_name: 'Doe' }),
      createPerson({ first_name: 'Jane', last_name: 'Doe' }),
      createPerson({ first_name: 'Bob', last_name: 'Smith' })
    ]);

    themes = await Promise.all([
      createTheme({ name: 'Databases' }),
      createTheme({ name: 'Query Building' })
    ]);

    books = await Promise.all([
      createBook({ title: 'Eager Loading', theme: themes[0] }),
      createBook({ title: 'Filtering', theme: themes[1] })
    ]);

    await people[0].books().attach(books.slice(0, 1));
    await people[1].books().attach(books.slice());
  });

  it('should join tables', async () => {

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .use(
        joining('people')
          .join('books_people')
          .join('books', { column: 'books_people.book_id', joinColumn: 'books.id', requiredJoin: 'books_people' })
      )
      .after('start', context => context.requireJoin('books'))
      .before('end', context => context.query.query(qb => qb.where('books.title', 'Eager Loading')))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(2);
    expect(result.pluck('first_name').sort()).to.eql([ 'Jane', 'John' ]);
  });

  it('should join tables based on a many-to-one relationship', async () => {

    const result = await new OrmQueryBuilder({ baseQuery: Book })
      .use(joining(Book).relations('theme'))
      .after('start', context => context.requireJoin('themes'))
      .before('end', context => context.query.query(qb => qb.where('themes.name', 'Databases')))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(1);
    expect(result.pluck('title').sort()).to.eql([ 'Eager Loading' ]);
  });

  it('should join tables based on a many-to-many relationship', async () => {

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .use(joining(Person).relations('books'))
      .after('start', context => context.requireJoin('books'))
      .before('end', context => context.query.query(qb => qb.where('books.title', 'Eager Loading')))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(2);
    expect(result.pluck('first_name').sort()).to.eql([ 'Jane', 'John' ]);
  });

  it('should join tables based on a one-to-many relationship', async () => {

    const result = await new OrmQueryBuilder({ baseQuery: Theme })
      .use(joining(Theme).relations('books'))
      .after('start', context => context.requireJoin('books'))
      .before('end', context => context.query.query(qb => qb.where('books.title', 'Filtering')))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(1);
    expect(result.pluck('name').sort()).to.eql([ 'Query Building' ]);
  });
});