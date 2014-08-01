/**
 * This module is responsible for capturing all data from the JavaScript source files.
 */
var parser = require('esprima');

module.exports = function(src){

  var result = {};

  // Retrieve parsed code
  result = parser.parse(src,{
    loc: true,
    raw: true,
    tokens: false,
    comment: true,
    tolerant: true
  });

  // Get any comments
  var comments = result.comments;
  var traverse = require('traverse');

  // Retrieve JS elements
  result = result.body.filter(function(el){
    return el.type === 'ExpressionStatement';
  })[0].expression;

  // Get the custom events
  var events = traverse(result).reduce(function(acc,x){
    if (this.key === 'name' && (x === 'fire' || x === 'fireAsync')) acc.push({method:this.node,name:this.parent.parent.parent.node.arguments[0].value});
    return acc;
  },[]);

  // Find and process any Polymer script elements
  try {
    if (result.callee.name === 'Polymer'){
      // Initial doc structure
      var res = {
        name: result.arguments[0].value,
        attributes: {},
        methods: {},
        events: {}
      };

      // Add properties
      result.arguments[1].properties.forEach(function(p){
        if (p.value.type === 'FunctionExpression'){
          res.methods[p.key.name] = p.value;
        } else {
          res.attributes[p.key.name] = p.value;
        }
      });
      result = res;
    } else {
      result = {};
    }
  } catch (e){
    result = {};
  }

  // TODO: Process tokens to pickup custom events (fire, asyncFire)

  result.comments = comments;

  result.events = {};
  events.forEach(function(evt){
    result.events[evt.name] = {async: evt.method === 'fireAsync'};
  });

  return result;

};
