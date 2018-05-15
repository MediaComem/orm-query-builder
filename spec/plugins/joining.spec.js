const { expect } = require('chai');
const { spy, stub } = require('sinon');

const { joining, OrmQueryBuilder } = require('../../');
const { OrmQueryJoinDefinition } = require('../../lib/plugins/joining');
const { bookshelf, cleanUp, db, setUp } = require('../utils/db');
const { Book, create, Person, Theme } = require('../utils/fixtures');

setUp();

describe('joining plugin', () => {

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

  it('should not do anything by default', async () => {

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const result = await new OrmQueryBuilder({ baseQuery })
      .use(
        joining('people')
          .join('books_people', { column: 'people.id', joinColumn: 'books_people.person_id' })
          .join('books', { column: 'books_people.book_id', joinColumn: 'books.id', requiredJoin: 'books_people' })
      )
      .execute();

    expect(result).to.be.an.instanceof(bookshelf.Collection);
    expect(result).to.have.lengthOf(3);
    expect(result.pluck('first_name')).to.eql([ 'Jane', 'John', 'Bob' ]);
    expect(result.map(person => person.related('books').toJSON())).to.eql([ [], [], [] ]);
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

  it('should not require an undefined join', async () => {

    const baseQuery = new Person().orderBy('last_name').orderBy('first_name');
    const builder = await new OrmQueryBuilder({ baseQuery })
      .use(
        joining('people')
          .join('books_people', { column: 'people.id', joinColumn: 'books_people.person_id' })
          .join('books', { column: 'books_people.book_id', joinColumn: 'books.id', requiredJoin: 'books_people' })
      )
      .after('start', context => context.requireJoin('foo'));

    await expect(builder.execute()).to.eventually.be.rejectedWith('The following joins have not been defined: foo');
  });

  it('should not define an already defined join', () => {
    const plugin = joining('people').join('books', { column: 'people.book_id', joinColumn: 'books.id' });
    expect(() => plugin.join('books', { column: 'people.bid', joinColumn: 'books.bid' })).to.throw('A join named "books" is already defined');
  });

  it('should not accept a join with no options', () => {
    const plugin = joining('people');
    expect(() => plugin.join('books')).to.throw('Join option "column" is required (the column name on which to join in the source table)');
  });

  it('should not accept a join with no table', () => {
    const plugin = joining();
    expect(() => plugin.join('books')).to.throw('Join source table is required');
  });

  it('should not accept a join with no name', () => {
    const plugin = joining('people');
    expect(() => plugin.join(null, { column: 'people.book_id', joinColumn: 'books.id' })).to.throw('Join name is required');
  });

  it('should not accept a join with no options', () => {
    const plugin = joining('people');
    expect(() => plugin.join('books', null)).to.throw('Join options are required');
  });

  it('should not accept a join with no column name', () => {
    const plugin = joining('people');
    expect(() => plugin.join('books', { joinColumn: 'books.id' })).to.throw('Join option "column" is required (the column name on which to join in the source table)');
  });

  it('should not accept a join with no join column name', () => {
    const plugin = joining('people');
    expect(() => plugin.join('books', { column: 'people.book_id' })).to.throw('Join option "joinColumn" is required (the column name on which to join in the target table)');
  });

  describe('relations', () => {
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

    it('should define multiple relations', () => {
      const plugin = joining(Person).relations('books', 'mainAddress');
      expect(plugin.modelRelations).to.eql({
        books: {},
        mainAddress: {}
      });
    });

    it('should define multiple relations with custom options', () => {
      const options = { foo: 'bar' };
      const plugin = joining(Person).relations('books', 'mainAddress', options);
      expect(plugin.modelRelations).to.eql({
        books: options,
        mainAddress: options
      });
    });

    it('should not define an already defined relation', () => {
      const plugin = joining(Person).relation('books');
      expect(() => plugin.relation('books')).to.throw('Relation "books" has already been defined');
    });
  });

  describe('join definition', () => {
    it('should update the query if the adapter applies a join definition', () => {

      const join = new OrmQueryJoinDefinition('people', 'books', { column: 'people.book_id', joinColumn: 'books.id' });

      const mockQuery = {};
      const mockQueryWithJoin = {};
      const mockContext = {
        adapter: { applyJoinDefinition: stub().returns(mockQueryWithJoin) },
        get: stub().returns(mockQuery),
        set: spy()
      };

      const result = join.apply(mockContext);
      expect(result).to.be.undefined;

      expect(mockContext.get).to.have.been.calledWith('query');
      expect(mockContext.get).to.have.callCount(1);

      expect(mockContext.adapter.applyJoinDefinition).to.have.been.calledWith(mockQuery, join, mockContext);
      expect(mockContext.adapter.applyJoinDefinition).to.have.been.calledImmediatelyAfter(mockContext.get);
      expect(mockContext.adapter.applyJoinDefinition).to.have.callCount(1);

      expect(mockContext.set).to.have.been.calledWith('query', mockQueryWithJoin);
      expect(mockContext.set).to.have.been.calledImmediatelyAfter(mockContext.adapter.applyJoinDefinition);
      expect(mockContext.set).to.have.callCount(1);
    });

    it('should throw an error if the adapter does not return a result', () => {

      const join = new OrmQueryJoinDefinition('people', 'books', { column: 'people.book_id', joinColumn: 'books.id' });

      const mockQuery = {};
      const mockContext = {
        adapter: { applyJoinDefinition: stub().returns(null) },
        get: stub().returns(mockQuery),
        set: spy()
      };

      expect(() => join.apply(mockContext)).to.throw('Adapter returned no result when applying join "books"');

      expect(mockContext.get).to.have.been.calledWith('query');
      expect(mockContext.get).to.have.callCount(1);

      expect(mockContext.adapter.applyJoinDefinition).to.have.been.calledWith(mockQuery, join, mockContext);
      expect(mockContext.adapter.applyJoinDefinition).to.have.been.calledImmediatelyAfter(mockContext.get);
      expect(mockContext.adapter.applyJoinDefinition).to.have.callCount(1);

      expect(mockContext.set).to.have.callCount(0);
    });
  });
});
