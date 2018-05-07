exports.up = async knex => {

  await knex.schema.createTable('people', t => {
    t.bigIncrements().primary();
    t.string('first_name', 50).notNullable();
    t.string('last_name', 50).notNullable();
  });

  await knex.schema.createTable('themes', t => {
    t.bigIncrements().primary();
    t.string('name', 50).notNullable();
  });

  await knex.schema.createTable('books', t => {
    t.bigIncrements().primary();
    t.string('title', 100).notNullable();
    t.bigInteger('theme_id').notNullable().references('themes.id').onUpdate('cascade').onDelete('cascade');
  });

  await knex.schema.createTable('books_people', t => {

    t.bigInteger('book_id')
      .notNullable()
      .references('books.id')
      .onUpdate('cascade')
      .onDelete('cascade');

    t.bigInteger('person_id')
      .notNullable()
      .references('people.id')
      .onUpdate('cascade')
      .onDelete('cascade');

    t.unique([ 'book_id', 'person_id' ]);
  });
};

exports.down = async knex => {
  await knex.schema.dropTableIfExists('books_people');
  await knex.schema.dropTableIfExists('books');
  await knex.schema.dropTableIfExists('people');
  await knex.schema.dropTableIfExists('themes');
};
