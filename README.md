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



## Concepts

The goal of ORM Query Builder is to help manage a typical database query in a complex application,
including the following:

* Filtering
* Paginating
* Sorting
* Eager loading

Additionally, you might often need to:

* Count the total number of elements, e.g. to provide pagination data to the client.
* Count the number of matching elements if you have filters, and make sure it's done before the
  request is paginated.
* Join additional tables to perform filtering or sorting (on other tables' columns).

All these operations have to be done in the right order. The total number of elements must be
counted before filters are applied. The number of matching filtered elements must be counted before
the offset and limit are applied for pagination. The correct table joins must be made for your
filters and sorting criteria, and you don't want to make the same join twice. Etc.

The goal of ORM Query Builder is to facilitate this process.

### Stages & query middleware

When executed, a query builder goes through stages sequentially, and does something at each stage.
There are 2 stages by default:

* `start` - Initialize the query.
* `end` - Execute the query and retrieve the result.

You can plug in query middleware function before or after any stage. A query middleware function is
simply a function that is passed the **execution context** of the query.

```js
// The base query you want to execute.
const baseQuery = new Person();
// Create a query builder from that query.
const builder = new OrmQueryBuilder({ baseQuery });

// Plug in a query middleware function after the start event
// (i.e. after the query has been added to the context).
builder.after('start', context => {
  // Retrieve the query from the context.
  const bookshelfQuery = context.get('query');
  // Log the query's SQL (the `query()` method of a Bookshelf query returns the underlying
  // Knex query, which can then be converted into a string).
  console.log('The query is:', bookshelfQuery.query().toString());
});

// Start execution, i.e. go through each stage and return the result.
builder.execute().then(result => console.log(`Found ${result.length} people`));

// OUTPUT:
// The query is: select * from people
// Found 42 people
```

You can **modify the query** in a query middleware function. The following example plugs in a
middleware **before the `end` event**, i.e. before the query builder actually executes the query.

```js
builder.before('end', context => {
  const currentQuery = context.get('query');
  context.set('query', currentQuery.where('email', 'foo@example.com'));
});

builder.execute().then(result => console.log(`Found ${result.length} people`));

// OUTPUT:
// The query is: select * from people where email = 'foo@example.com'
// Found 24 people
```

You can **modify the result** in a query middleware function. The following example plugs in a
middleware **after the `end` event**, i.e. after the query has been executed and the result
retrieved.

```js
builder.after('end', context => {
  const result = context.get('result');
  context.set('result', result.map(person => person.toJSON()));
});

builder.execute().then(result => console.log(result));

// OUTPUT:
// The query is: select * from people where email = 'foo@example.com'
// [
//   {
//     name: "Foo",
//     email: "foo@example.com"
//   },
//   ...
// ]
```

You can **add new stages** in a query middleware function. The following example plugs in a
middleware after the `start` event and **adds a new `countTotal` stage** to be executed next.

```js
const baseQuery = new Person();
const builder = new OrmQueryBuilder({ baseQuery });

builder.after('start', context => {
  console.log('start stage done');
  context.addStages('countTotal');
});

builder.after('countTotal', () => console.log('countTotal stage done'));
builder.after('end', () => console.log('end stage done'));

builder.execute().then(() => console.log('done'));

// OUTPUT:
// start stage done
// countTotal stage done
// end stage done
// done
```

Note that query middleware can also be defined as an object with an `execute()` function (e.g.
class instances may also be used as query middleware).

```js
const queryMiddlewareFunc = context => console.log('Hello Alice');
const queryMiddlewareObject = {
  execute: context => console.log('Hello Bob')
};

builder.after('start', queryMiddlewareFunc);
builder.after('start', queryMiddlewareObject);
builder.execute();

// OUTPUT:
// Hello Alice
// Hello Bob
```

### Result

A query builder's `execute()` method returns the result of the query by default:

```js
builder.execute().then(result => console.log(result.length)); // 24
```

Sometimes you might want to retrieve the whole execution context, e.g. to retrieve data added by
some middleware:

```js
builder.execute({ result: 'context' }).then(context => {
  console.log(context.get('result'));  // 24
  console.log(context.get('foo'));     // "bar"
});
```

### Plugins

An ORM Query Builder **plugin** is simply anything that has a `use()` function. If you pass a plugin
to a query builder, it will call that plugin's `use()` function with itself.

```js
const plugin = {
  use: function(builder) {

    builder.after('start', context => {
      const currentQuery = context.get('query');
      console.log('The query is:', currentQuery.query().toString());
    });

    builder.before('end', context => {
      const currentQuery = context.get('query');
      context.set('query', currentQuery.where('email', 'foo@example.com'));
    });
  }
};

const baseQuery = new Person();
const builder = new OrmQueryBuilder({ baseQuery });

builder.use(plugin);
builder.execute().then(result => console.log(`Found ${result.length} people`));

// OUTPUT:
// The query is: select * from people where email = 'foo@example.com'
// Found 24 people
```

Plugins can be used to encapsulate complex functionality like pagination.

### Adapters

ORM Query Builder isn't built around a specific ODM/ORM. To know how to initialize and execute a
query, it needs an **adapter**, basically a bag of utility functions to manipulate that ODM/ORM's
queries.

An adapter **must** implement the following functions:

* `createQuery` - Create a query from an execution context.

  The execution context has an `options` property which contains the options passed to the builder
  at construction, merged with the options passed to its `execute` method. A barebones
  implementation could be to simply return a base query that has to be provided in the options:

  ```js
  function createQuery(context) {
    return context.options.baseQuery;
  }
  ```
* `executeQuery` - Execute a query.

  ORM Query Builder doesn't know how to execute your ODM/ORM's queries, so you have to do it. This
  is an example of how to execute a Bookshelf query:

  ```js
  function executeQuery(query, context) {
    return query.fetchAll();
  }
  ```
* `executeCountQuery` - Execute the current query as a count.

  ORM Query Builder doesn't know how to count either. This is an example of how to do it with
  Bookshelf:

  ```js
  function executeCountQuery(query, context) {
    // With Bookshelf, we have to `clone()` the query first, as all Bookshelf methods
    // mutate the query without making a copy.
    return query.clone().count().then(value => parseInt(value, 10));
  }
  ```

An adapter **may** implement the following functions that are required by some plugins:

* `eagerLoad` - Eager load relations after the query has been executed.
* `getQueryIdentifier` - Return a value that can be used to identify a query in its current state.
  The value should be the same if the query is the same, and it should differ on a query that has
  been modified. This is used by some plugins to determine whether a query has changed between
  stages.
* `getTableName` - Return the name of the query's main table (for SQL-friendly ORMs).
* `orderQueryBy` - Apply sorting to a query.
* `paginateQuery` - Apply an offset and limit to a query.
* `getJoinDefinitions` - Return a list of possible table joins based on a model (for SQL-friendly
  ORMs).
* `applyJoinDefinition` - Apply a join definition to a query (for SQL-friendly ORMs).

See the [Bookshelf adapter](lib/adapters/bookshelf.js) for a full example.



## Provided plugins

### Pagination

**Requirements:** an adapter that supports `getQueryIdentifier` and `paginateQuery`.

```js
const { OrmQueryBuilder, pagination } = require('orm-query-builder');

const builder = new OrmQueryBuilder();
builder.use(pagination());
```

The pagination plugin adds 2 new stages, `countTotal` and `paginate`, after the `start` stage,
making the stages list as follows on a query builder with no other plugin:

* `start` - Initialize the query.
* `countTotal` - Count the total number of elements.
* *(Apply any filters here.)*
* `paginate` - Count the number of matching elements and apply offset and limit to the query.
* `end` - Execute the query.

As indicated, filters should be applied **before the `paginate` stage** in order to be taken into
account when the number of matching elements is counted.

The pagination plugin will add data to the execution context after the `start` stage, which you can
use to send information back to the client, e.g. a `Link` header.

```js
console.log(context.get('pagination'));
// {
//   filteredTotal: 123,
//   offset: 0,
//   limit: 50,
//   total: 570
// }
```

#### Options

* **`getOffset`** - A function that retrieves the offset to apply from the context. (May also be a
  string path to retrieve from the context using [Lodash's `get` function][lodash-get].)

  ```js
  pagination({
    getOffset: context => context.options.pageSize * (context.options.page - 1)
  });
  ```

  By default, the pagination plugin expects an `offset` property in the context's options.
* **`getLimit`** - A function that retrieves the limit to apply from the context. (May also be a
  string path to retrieve from the context using [Lodash's `get` function][lodash-get].)

  ```js
  pagination({
    getLimit: context => context.options.pageSize
  });
  ```

  By default, the pagination plugin expects a `limit` property in the context's options.
* **`getDefaultLimit`** - A function that retrieves the default limit to apply if no limit is found
  in the context.

  ```js
  pagination({
    getDefaultLimit: () => 100
  });
  ```

  By default, the pagination plugin returns the `defaultLimit` property of the context's options, or
  100.
* **`getMaxLimit`** - A function that retrieves the maximum limit that is allowed for pagination.
  (If the specified limit exceeds it, the default limit is used instead.)

  ```js
  pagination({
    getMaxLimit: () => 500
  });
  ```

  By default, the pagination plugin returns the `maxLimit` property of the context's options, or
  250.

### Sorting

**Requirements:** an adapter that supports `orderQueryBy`.

```js
const { OrmQueryBuilder, sorting } = require('orm-query-builder');

const builder = new OrmQueryBuilder();
builder.use(
  sorting()
    .sorts('foo', 'bar') // Simple sorts
    .sort('name', direction => query => { // Complex sort
      return query.orderBy('last_name', direction).orderBy('first_name', direction);
    })
    .defaultSort('foo', 'name') // Sorts to be applied by default
);
```

The sorting plugin dynamically applies sorting criteria to your query before the `end` stage, based
on the execution context's options. It is also a middleware that you can apply at another stage if
you wish:

```js
const { OrmQueryBuilder, sorting } = require('orm-query-builder');

const builder = new OrmQueryBuilder();
builder.after('myStage', sorting().sorts('foo', 'bar'));
```

The idea is to define what sorts are available (e.g. by name, by creation date), and how to apply
those sorts if need be. Then the plugin will automatically apply the sorts based on the `sort`
property of the context's options.

#### Methods

* **`sort(name, factory)`** - Defines a custom sort. The `factory(direction, context)` argument is a
  function that will be called with the sort direction and the execution context. It must return a
  function that takes the current query and returns a modified version of the query with the sort
  applied.

  ```js
  sorting().sort('foo', (direction, context) => query => query.orderBy('foo', direction));
  ```
* **`sorts(...names)`** - Defines multiple simple sorts. These sorts are simply applied to the query
  with the adapter's `orderQueryBy(query, name, direction, context)` method, which will be called
  with the query, sort name and direction.

  You can customize how simple sorts are applied by providing the `createSimpleSort` option as
  documented below.
* **`default(...sorts)`** - Defines the default sorts to apply. This is in the same format as
  the `sort` execution option documented below, e.g. `[ "foo", "bar-desc" ]` (the object form is
  also supported).

#### Options

* **`getSort(context)`** - A function that returns the sort criteria to apply from the context. (May
  also be a string path to retrieve from the context using [Lodash's `get` function][lodash-get].)

  ```js
  sorting({
    getSort: context => context.options.orderBy
  })
  ```

  By default, the sorting plugin expects a `sort` property in the context's options.
* **`createSimpleSort(name)`** - A function that returns a sort factory from a sort name. It will be
  used to create simple sorts defined with the plugin's `sorts(...names)` method. The returned sort
  factory must behave the same as one that would be passed to the plugin's `sort(name, factory)`
  method.

  ```js
  const inflection = require('inflection');

  sorting({
    createSimpleSort: name => (direction, context) => query => {
      // For example, this automatically underscores sort names
      // into column names (e.g. "firstName" => "first_name").
      return context.adapter.orderQueryBy(query, inflection.underscore(name), direction, context);
    }
  })
  ```

#### Execution options

The **`sort`** option is expected to have one of the following formats:

* String-based with `-asc` and `-desc` suffixes indicating the direction, ascending by default.

  ```json
  [ "foo", "bar-asc", "baz-desc" ]
  ```
* Object-based with a `name` and optional `direction` property (ascending by default).

  ```js
  [
    { name: "foo" },
    { name: "bar", direction: "asc" },
    { name: "baz", direction: "desc" }
  ]
  ```

A single sort parameter can also be specified, e.g. just `"foo"`. It will automatically be wrapped
into an array.



[bookshelf]: http://bookshelfjs.org
[lodash-get]: https://lodash.com/docs/#get
[node]: https://nodejs.org/en/
