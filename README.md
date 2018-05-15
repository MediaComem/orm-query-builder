# ORM Query Builder

An extensible wrapper around Object Document Mappers (ODMs) or Object Relational Mappers (ORMs) to
facilitate using filters, pagination and sorting when making database queries.

[Bookshelf][bookshelf] is supported out of the box, but you should be able to use any ODM/ORM by
providing an adapter that implements basic operations on its queries.

[![npm version](https://badge.fury.io/js/orm-query-builder.svg)](https://badge.fury.io/js/orm-query-builder)
[![Build Status](https://travis-ci.org/MediaComem/orm-query-builder.svg?branch=master)](https://travis-ci.org/MediaComem/orm-query-builder)
[![Coverage Status](https://coveralls.io/repos/github/MediaComem/orm-query-builder/badge.svg?branch=master)](https://coveralls.io/github/MediaComem/orm-query-builder?branch=master)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

Developed at the [Media Engineering Institute](http://mei.heig-vd.ch) ([HEIG-VD](https://heig-vd.ch)).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
  - [Requirements](#requirements)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->



## Installation

```bash
npm install orm-query-builder
```

### Requirements

* [Node.js][node] 8+
* An ODM/ORM adapter (one is provided for [Bookshelf][bookshelf])



## Usage

**TL;DR**

```js
// Bookshelf domain model.
const Address = bookshelf.model('Address', {});
const Person = bookshelf.model('Person', {
  addresses: function() {
    return this.hasMany('Address');
  }
});

// Create a builder starting from a base query.
const baseQuery = new Person();
const builder = new OrmQueryBuilder({ baseQuery });

// Apply the pagination plugin (will use "offset" & "limit" options).
builder.use(pagination());
// Define available joins from model relations (for SQL-friendly ORMs).
builder.use(joining(Person).relation('addresses'));
// Define available sorting orders and the defaults (will use "sort" option).
builder.use(sorting().sorts('email', 'firstName', 'lastName').defaultSort('lastName', 'firstName'));
// Define conditional eager loading.
builder.use(eagerLoading().loadWhen(context => context.options.include.indexOf('addresses') >= 0, 'addresses'));

// Define a filter to apply before pagination.
builder.before('paginate', context => {
  if (context.options.email) {
    // Modify the query to be executed.
    const currentQuery = context.get('query');
    context.set('query', currentQuery.where('email', context.options.email));
  }
});

// Define another filter.
builder.before('paginate', context => {
  if (context.options.city) {
    // Require a join to be applied.
    context.requireJoin('addresses');
    // Modify the query with a condition on the joined table.
    const currentQuery = context.get('query');
    context.set('query', currentQuery.where('addresses.city', context.options.city));
  }
});

// Execute the query in an Express route.
const app = express();
app.get('/people', (req, res, next) => {
  builder.execute({
    // Return the full execution context, not only the result.
    result: 'context',
    // Pass relevant options from the HTTP request.
    city: req.query.city,
    email: req.query.email,
    include: req.query.include || [],
    limit: req.query.limit,
    offset: req.query.offset,
    sort: req.query.sort
  }).then(context => {
    // Use plugin data to modify response.
    res.set('Pagination-Total', context.get('pagination.total'));
    res.set('Pagination-Filtered-Total', context.get('pagination.filteredTotal'));
    // Send the result of the query.
    const result = context.get('result');
    res.send(result.toJSON());
  }).catch(next);
});

app.listen(process.env.PORT || 3000);
```

A more detailed explanation of this example:

```js
const Bookshelf = require('bookshelf');
const express = require('express');
const knex = require('knex');

// Import the builder and various utility plugins.
const { eagerLoading, joining, OrmQueryBuilder, pagination, sorting } = require('orm-query-builder');

// Configure the connection to the database (this example uses the Bookshelf ORM and Knex,
// and assumes that a PostgreSQL database named "orm-query-builder" exists on your local machine).
const db = knex({ client: 'postgresql', connection: 'postgresql://localhost/orm-query-builder' });
const bookshelf = Bookshelf(db);
bookshelf.plugin('registry');

// Create an Address model.
const Address = bookshelf.model('Address', {});

// Create a Person model that has many addresses.
const Person = bookshelf.model('Person', {
  addresses: function() {
    return this.hasMany('Address');
  }
});

// Create a builder starting from a base query.
// With Bookshelf, `new Person()` creates a model which we can use as a base query.
const baseQuery = new Person();
const builder = new OrmQueryBuilder({ baseQuery });

// When executed, a query builder goes through stages. There are two stages by default:
// "start" and "end". You can plug in query middleware functions before or after any
// stage. A query middleware function is simply a function that receives an execution
// context object and does what it wants with it. It can return a promise if it needs
// to perform asynchronous work.
builder.after('start', context => {
  // The database query object (from your ODM/ORM) can be retrieved from the context
  // after the "start" event.
  const currentQuery = context.get('query');
  // You could modify "currentQuery" here...
  context.set(currentQuery);
});

// After the "end" event, the query has been executed and the result can also be
// retrieved from the context.
builder.after('end', context => {
  const result = context.get('result');
  console.log('The result of executing the query is', result);
  // You could modify "result" here...
  context.set('result', result);
});

// Query builder plugins are objects that have a "use" function.
const plugin = {
  // The "use" function is called with the builder.
  use: function(builder) {
    // Customize it as needed.
    builder.after('start', context => console.log('query is ready to be customized'));
    builder.before('end', context => console.log('query is about to be executed'));
    builder.after('end', context => console.log('result is available'));
  }
};

// Plugins are passed to the query builder's "use" method.
builder.use(plugin);

// A few plugins are provided out of the box.
//
// The pagination plugin will use the "offset" and "limit" options passed to the
// "execute" method later to paginate the request, and also count the total number
// of records before paginating.
//
// Additionally, if you apply filters before the pagination is done (see examples
// below), the plugin will make an additional count request to count the total
// number of matching elements.
//
// This information can later be retrieved and used in the response (e.g. to add a
// Link header to indicate the previous/next pages in the collection).
builder.use(pagination());

// The pagination plugin adds 2 new stages, "countTotal" and "paginate". You can
// register query middleware functions to be executed before these stages to further
// modify the query.
//
// For example, here we implement an e-mail filter. This filter will be applied
// after the total number of records has been counted, but before the number of
// matching records has been counted and before the pagination has been applied to
// the main query.
builder.before('paginate', context => {
  if (context.options.email) {
    const currentQuery = context.get('query');
    context.set('query', currentQuery.where('email', context.options.email));
  }
});

// The joining plugin facilitates the management of table joins for SQL-friendly ORMs.
// You can tell it to check a model's relations (in this case the "addresses" relation
// of the Bookshelf model "Person") for later use.
builder.use(joining(Person).relation('addresses'));

// Here's another filter, this time making use of the joining plugin.
builder.before('paginate', context => {
  if (context.options.city) {

    // The joining filter has added the "requireJoin" function to the context,
    // which you can use to indicate that you require this join to be applied to
    // the query for your filter condition to work.
    //
    // The joining plugin will help you avoid applying a join twice, and will
    // automatically apply the multiple joins that may be needed to access a given
    // relation (e.g. go through a many-to-many join table).
    context.requireJoin('addresses');

    // You can now add a condition using the joined table to the query.
    const currentQuery = context.get('query');
    context.set('query', currentQuery.where('addresses.city', context.options.city));
  }
});

// The sorting plugin helps you define which sorting orders are available for your
// query, in this case "email", "firstName" and "lastName". You can also define the
// default sorts you want applied.
//
// It will then use the "sort" option passed to the "execute" method later to determine
// which sorts to apply.
builder.use(sorting().sorts('email', 'firstName', 'lastName').defaultSort('lastName', 'firstName'));

// The eager loading plugin can be used to tell your ORM to eager load some of your
// model's relations after the main query has been executed.
//
// This example conditionally eager loads the "addresses" relation when the "include"
// option contains the string "addresses".
builder.use(eagerLoading().loadWhen(context => context.options.include.indexOf('addresses') >= 0, 'addresses'));

// Here's an Express route to demonstrate how to use the builder now that it's configured.
const app = express();
app.get('/people', (req, res, next) => {

  // Execute the configured database query.
  builder.execute({

    // By setting the "result" option to "context", you can tell the query builder to
    // return its full execution context, not only the query result (which is what is
    // returned by default). This is useful, for example, to retrieve the data from the
    // pagination plugin.
    result: 'context',

    // Pass relevant options from the HTTP request (in this case from Express's "req" object).
    // They are available to query middleware functions on the context's "options" property.
    city: req.query.city,
    email: req.query.email,
    include: req.query.include || [],
    limit: req.query.limit,
    offset: req.query.offset,
    sort: req.query.sort
  }).then(context => {

    // The context object may contain various data set by plugins. For example, the
    // pagination plugin adds a "pagination" object with various properties, including
    // the number of records it has counted before and after filters.
    res.set('Pagination-Total', context.get('pagination.total'));
    res.set('Pagination-Filtered-Total', context.get('pagination.filteredTotal'));

    // You can get the query result from the context. In this example, it's a Bookshelf
    // Collection. It has a toJSON() method which serializes the models within.
    const result = context.get('result');
    res.send(result.toJSON());
  }).catch(next);
});

app.listen(process.env.PORT || 3000);
```



[bookshelf]: http://bookshelfjs.org
[node]: https://nodejs.org/en/
