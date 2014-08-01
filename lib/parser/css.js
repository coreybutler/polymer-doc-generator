var parser = require('css-parse');

module.exports = function(css){
  return parser(css).stylesheet.rules;
};
