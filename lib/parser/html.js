/**
 * This module is responsible for capturing all data from the JavaScript source files.
 */
var parser = require('htmlparser2'),
    wrench = require('wrench'),
    path = require('path'),
    fs = require('fs');

var Class = function(content,fileroot){

  // Initialize a counter & helper vars
  var processed = 0,
    me = this;

  // Retrieve parsed code
  var res = {attributes:{}};
  var parseengine = new parser.Parser({
    onopentag: function(tag,attr){
      switch(tag.toLowerCase()){
        case 'polymer-element':
          res.name = attr.name;
          if (attr.constructor){
            res.constructor = attr.constructor;
          }
          if (attr.extends){
            res.extends = attr.extends;
          }
          // ID the attributes
          (attr.attributes||'').split(' ').forEach(function(a){
            res.attributes[a] = {};
          });
          break;
        case 'link':
          if (attr.rel && attr.rel === 'stylesheet'){
            res.css = res.css || [];
            res.css.push(path.join((fileroot||''),attr.href));
          }
        default:
          if (attr.id){
            res.$ = res.$ || {};
            res.$[attr.id] = tag;
          }
      }
    },
    oncomment: function(str){
      res.comments = (res.comments||[]).push(str);
    },
    onend: function(){
      me.emit('fileprocessed',res);
    }
  });

  this.process = function(){
    parseengine.parseComplete(content);
  };

};

var Emitter = require('events').EventEmitter;
require('util').inherits(Class,Emitter);

// Export the class
module.exports = Class;
