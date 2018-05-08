const chance = require('chance').Chance();
const testValueGenerator = require('test-value-generator');

const { bookshelf } = require('./db');

exports.Person = bookshelf.model('Person', {
  tableName: 'people',

  books: function() {
    return this.belongsToMany('Book');
  }
});

exports.createPerson = (properties = {}) => {
  return new exports.Person({
    first_name: properties.first_name || exports.firstName(),
    last_name: properties.last_name || exports.lastName()
  }).save();
};

exports.firstName = testValueGenerator.unique(() => chance.first());
exports.lastName = testValueGenerator.unique(() => chance.last());
