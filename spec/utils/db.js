const Bookshelf = require('bookshelf');
const debug = require('debug')('orm-query-builder');
const knex = require('knex');

const knexConfig = require('../../knexfile').test;

const db = knex(knexConfig);

db.on('query-error', err => debug(err));
db.on('query-response', (res, obj, builder) => debug(builder.toString()));

const bookshelf = Bookshelf(db);
bookshelf.plugin('registry');

async function cleanUp() {

  await db.delete().from('books_people');

  await Promise.all([
    db.delete().from('books'),
    db.delete().from('people')
  ]);

  await db.delete().from('themes');
}

let setup = false;
async function setUp() {
  if (!setup) {
    setup = true;
    after(() => db.destroy());
  }
}

module.exports = { bookshelf, cleanUp, db, setUp };
