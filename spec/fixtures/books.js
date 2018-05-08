const chance = require('chance').Chance();
const testValueGenerator = require('test-value-generator');

const { bookshelf } = require('./db');

exports.Book = bookshelf.model('Book', {
  tableName: 'books',

  theme: function() {
    return this.belongsTo('Theme');
  }
});

exports.createBook = (properties = {}) => {
  return new exports.Book({
    title: properties.title || exports.title(),
    theme_id: properties.theme_id || (properties.theme && properties.theme.get('id'))
  }).save();
};

exports.title = testValueGenerator.unique(() => chance.sentence());
