const { get } = require('lodash');

exports.resolveGetter = function(value, defaultGetter) {
  if (typeof(value) === 'function') {
    return value;
  } else if (typeof(value) === 'string') {
    return context => get(context, value);
  } else if (value) {
    throw new Error(`Unsupported option getter type ${typeof(value)}`);
  } else {
    return defaultGetter;
  }
};

exports.resolveOption = function(type, value, availableFactories, defaultFactory, ...defaultFactoryArgs) {
  if (typeof(value) === 'string') {

    const factory = availableFactories[value];
    if (!factory) {
      throw new Error(`Unknown ${type} "${value}"`);
    }

    return factory(...defaultFactoryArgs);
  } else if (value) {
    return value;
  } else {
    return defaultFactory(...defaultFactoryArgs);
  }
};
