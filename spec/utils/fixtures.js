const { bookshelf } = require('./db');

exports.create = function(model, ...fixtures) {
  return Promise.all(fixtures.map(fixture => new model(fixture).save()));
};

exports.Book = bookshelf.model('Book', {
  tableName: 'books',

  theme: function() {
    return this.belongsTo('Theme');
  }
});

exports.Person = bookshelf.model('Person', {
  tableName: 'people',

  books: function() {
    return this.belongsToMany('Book');
  },

  themes: function() {
    return this.hasMany('Theme').through('Book');
  }
});

exports.Theme = bookshelf.model('Theme', {
  tableName: 'themes',

  books: function() {
    return this.hasMany('Book');
  }
});
