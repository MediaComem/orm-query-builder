const chance = require('chance').Chance();
const testValueGenerator = require('test-value-generator');

const { bookshelf } = require('./db');

exports.Theme = bookshelf.model('Theme', {
  tableName: 'themes',

  books: function() {
    return this.hasMany('Book');
  }
});

exports.createTheme = (properties = {}) => {
  return new exports.Theme({
    name: properties.name || exports.name()
  }).save();
};

exports.name = testValueGenerator.unique(() => chance.word());
