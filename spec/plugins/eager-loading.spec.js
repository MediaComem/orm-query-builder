const { expect } = require('chai');
const { includes } = require('lodash');
const { spy } = require('sinon');

const { eagerLoading, OrmQueryBuilder } = require('../../');
const { bookshelf, cleanUp, db, setUp } = require('../utils/db');
const { Book, create, Person, Theme } = require('../utils/fixtures');

setUp();

describe('eager loading plugin', () => {
  beforeEach(cleanUp);

  it('should eager load relations', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const [ theme ] = await create(Theme, { name: 'Query Building' });

    const books = await create(Book,
      { title: 'Eager Loading', theme_id: theme.get('id') },
      { title: 'Filtering', theme_id: theme.get('id') }
    );

    people[0].books().attach(books.slice(0, 1));
    people[1].books().attach(books.slice());

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .use(eagerLoading().load('books.theme'))
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

  it('should conditionally eager load relations', async () => {

    const people = await create(Person,
      { first_name: 'John', last_name: 'Doe' },
      { first_name: 'Jane', last_name: 'Doe' },
      { first_name: 'Bob', last_name: 'Smith' }
    );

    const [ theme ] = await create(Theme, { name: 'Query Building' });

    const books = await create(Book,
      { title: 'Eager Loading', theme_id: theme.get('id') },
      { title: 'Filtering', theme_id: theme.get('id') }
    );

    people[0].books().attach(books.slice(0, 1));
    people[1].books().attach(books.slice());

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery, include: [ 'books' ] })
      .use(
        eagerLoading()
          .loadWhen(context => includes(context.options.include, 'books'), 'books')
          .loadWhen(context => includes(context.options.include, 'books.theme'), 'books.theme')
      )
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
      expect(book.related('theme').toJSON()).to.eql({});
    }
  });
});
