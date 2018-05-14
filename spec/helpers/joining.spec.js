const { expect } = require('chai');
const { spy } = require('sinon');

const { joining, OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../utils/db');
const { Book, create, Person, Theme } = require('../utils/fixtures');

setUp();

describe('joining helper', () => {

  let books, people, themes;
  beforeEach(async () => {
    await cleanUp();

    people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    themes = await create(Theme,
      { name: 'Databases' },
      { name: 'Query Building' }
    );

    books = await create(Book,
      { title: 'Eager Loading', theme_id: themes[0].get('id') },
      { title: 'Filtering', theme_id: themes[1].get('id') }
    );

    await people[0].books().attach(books.slice(0, 1));
    await people[1].books().attach(books.slice());
  });

  it('should join tables', async () => {

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .use(
        joining('people')
          .join('books_people', { column: 'people.id', joinColumn: 'books_people.person_id' })
          .join('books', { column: 'books_people.book_id', joinColumn: 'books.id', requiredJoin: 'books_people' })
      )
      .after('start', context => context.requireJoin('books'))
      .before('end', context => context.set('query', context.get('query').query(qb => qb.where('books.title', 'Eager Loading'))))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(2);
    expect(result.pluck('first_name').sort()).to.eql([ 'Jane', 'John' ]);
  });

  it('should correctly order required joins', async () => {

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .use(
        joining('people')
          .join('books_people', { column: 'people.id', joinColumn: 'books_people.person_id' })
          .join('books', { column: 'books_people.book_id', joinColumn: 'books.id', requiredJoin: 'books_people' })
          .join('themes', { column: 'books.theme_id', joinColumn: 'themes.id', requiredJoin: 'books' })
      )
      .after('start', context => context.requireJoin('themes', 'books'))
      .before('end', context => context.set('query', context.get('query').query(qb => qb.where('themes.name', 'Query Building'))))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(1);
    expect(result.pluck('first_name').sort()).to.eql([ 'Jane' ]);
  });

  it('should join tables based on a many-to-one relationship', async () => {

    const result = await new OrmQueryBuilder({ baseQuery: Book })
      .use(joining(Book).relations('theme'))
      .after('start', context => context.requireJoin('themes'))
      .before('end', context => context.set('query', context.get('query').query(qb => qb.where('themes.name', 'Databases'))))
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
      .before('end', context => context.set('query', context.get('query').query(qb => qb.where('books.title', 'Eager Loading'))))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(2);
    expect(result.pluck('first_name').sort()).to.eql([ 'Jane', 'John' ]);
  });

  it('should join tables based on a one-to-many relationship', async () => {

    const result = await new OrmQueryBuilder({ baseQuery: Theme })
      .use(joining(Theme).relations('books'))
      .after('start', context => context.requireJoin('books'))
      .before('end', context => context.set('query', context.get('query').query(qb => qb.where('books.title', 'Filtering'))))
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(1);
    expect(result.pluck('name').sort()).to.eql([ 'Query Building' ]);
  });
});
