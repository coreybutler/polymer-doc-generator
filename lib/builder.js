/**
 * The builder module is responsible for combining all of the documentation assets into a final format.
 * In particular, it establishes references between documents (i.e. process "extends", "links", etc.).
 * Once all references are resolved, a JSON object is produced for each web component.
 */
require('colors');
var commentparser = require('comment-parser'),
    fs = require('fs'),
    path = require('path');

var mod = function(out){

  if (!out){
    console.log('\n  ERROR: No output directory defined.'.red.bold);
    process.exit(1);
  } else if (!fs.existsSync(out)){
    console.log('\n  ERROR: The specified output directory does not exist or could not be found:\n  --> '.red.bold+out.red.bold);
    process.exit(1);
  }

  var me = this,
    src = {
      html: {},
      css: [],
      js: {}
    };

  // Add parsed content
  this.addContent = function(type,file,json){
    if (type === 'js'){
      src.js[json.name] = json;
      delete src.js[json.name].name;
    } else if (type === 'html' || type === 'htm'){
      src.html[json.name] = json;
      delete src.html[json.name].name;
    } else {
      src[type][file] = json;
    }
    console.log(' --> Processed '+file);
  };

  // Build everything
  this.build = function(){

    console.log('\nBuilding documentation sources...'.green);

    // Add all known web components from HTML
    var component = src.html;

    // Update with JavaScript
    Object.keys(src.js).forEach(function(nm){
      var c = src.js[nm];
      component[nm] = component[nm] || {};

      // Consolidate Attributes
      for (var a in c.attributes){
        component[nm].attributes[a] = {
          reflect: c.type === 'ObjectExpression' ? c.properties.reflect || false : false,
          'default': c.attributes[a].value
        };
      }

      // Add methods & custom events
      Object.keys(c.methods).forEach(function(method){
        var m = c.methods[method];
        delete m.type;
        delete m.id;
        delete m.body;
        delete m.rest;
        delete m.expression;
        delete m.loc;
        var p = m.params;
        m.params = {};
        p.forEach(function(parm){
          m.params[parm.name] = {type:'String',description:''};
        });
        c.methods[method] = m;
      });
      component[nm].methods = c.methods;
      component[nm].events = c.events;

      // Process JS comments
      (c.comments||[]).forEach(function(cmt){
        var data = commentparser('/*'+cmt.value+'*/')[0];
        if (data){
          // Handle custom method documentation
          if (data.tags.filter(function(t){return t.tag.toLowerCase() === 'method'})){
            var m = data.tags.filter(function(t){return t.tag.toLowerCase() === 'method'});
            if (m.length){
              m = m[0].name;
              component[nm].methods[m] = component[nm].methods[m] || {};
              data.tags.forEach(function(tt){
                if (tt.tag.toLowerCase() !== 'method'){
                  if (tt.tag.toLowerCase() === 'param'){
                    component[nm].methods[m].params[tt.name] = tt;
                  } else {
                    component[nm].methods[m][tt.tag] = tt;
                  }
                }
              });
            }
          }
          // Handle custom event documentation
          if (data.tags.filter(function(t){return t.tag.toLowerCase() === 'event'})){
            var m = data.tags.filter(function(t){return t.tag.toLowerCase() === 'event'});
            if (m.length){
              m = m[0].name;
              component[nm].events[m] = component[nm].events[m] || {};
              data.tags.forEach(function(tt){
                if (tt.tag.toLowerCase() !== 'event'){
                  component[nm].events[m][tt.tag] = tt;
                } else {
                  if(tt.hasOwnProperty('description')){
                    component[nm].events[m].description = tt.description;
                  }
                }
              });
            }
          }
          // Handle custom attribute documentation
          if (data.tags.filter(function(t){return t.tag.toLowerCase() === 'attribute'})){
            var m = data.tags.filter(function(t){return t.tag.toLowerCase() === 'attribute'});
            if (m.length){
              m = m[0].name;
              if (component[nm].attributes.hasOwnProperty(m)){
                component[nm].attributes[m].private = true;
              } else {
                component[nm].attributes[m] = {private:true};
              }
              data.tags.forEach(function(tt){
                if (tt.hasOwnProperty('description')){
                  component[nm].attributes[m].description = tt.description;
                }
                if (tt.hasOwnProperty('type')){
                  component[nm].attributes[m].type = tt.type.trim() === '' ? 'String' : tt.type.trim();
                }
              });
            }
          }
          // Add any additional documentation elements
          Object.keys(data).filter(function(el){return el !== 'tags'}).forEach(function(el){
            component[nm][el] = data[el];
          });

          // Remove CSS until custom CSS properties land
          delete component[nm].css;
        }
      });
    });

    // Validate all data before generating JSON
    Object.keys(component).forEach(function(nm){
      var c = component[nm];
      c.attributes = c.attributes || {};
      Object.keys(c.attributes).forEach(function(attr){
        c.attributes[attr].reflect = c.attributes[attr].reflect || false;
        c.attributes[attr]['default'] = c.attributes[attr]['default'] || undefined;
        c.attributes[attr]['type'] = c.attributes[attr]['type'] || 'String';
      });
      if (c.hasOwnProperty('$')){
        component[nm].shadow = c.$;
        delete component[nm].$;
      }

      // Sort attributes, methods, and events by name
      var attr = component[nm].attributes||{};
      component[nm].attributes = {};
      Object.keys(attr).sort().forEach(function(a){
        component[nm].attributes[a] = attr[a];
        // Remove unnecessary attributes
        if (component[nm].attributes[a].hasOwnProperty('description')){
          if (component[nm].attributes[a].description.trim().length===0){
            delete component[nm].attributes[a].description;
          }
        }
        // Add privacy
        component[nm].attributes[a].private = component[nm].attributes[a].hasOwnProperty('private') === true ? component[nm].attributes[a].private : false;
      });

      // Remove unnecessary methods (Change handlers)
      Object.keys(component[nm].methods||{}).filter(function(a){
        if (component[nm].attributes.hasOwnProperty('observe')){
          if (Object.keys(component[nm].attributes.observe).map(function(attr){
            return component[nm].attributes.observe[attr];
          }).indexOf(a) >= 0){
            return false;
          }
        }
        return a.substr(a.length-7,7).indexOf('Changed') >= 0;
      }).forEach(function(a){
        component[nm].methods[a].observer = true;
      });

      var attr = component[nm].methods||{};
      component[nm].methods = {};

      Object.keys(attr).sort().forEach(function(a){
        component[nm].methods[a] = attr[a];
        // Remove unnecessary attributes
        delete component[nm].methods[a].defaults;
        Object.keys(component[nm].methods[a].params).forEach(function(p){
          if (component[nm].methods[a].params[p].hasOwnProperty('tag')){
            delete component[nm].methods[a].params[p].tag;
          }
          if (component[nm].methods[a].params[p].hasOwnProperty('description')){
            if (component[nm].methods[a].params[p].description.trim().length===0){
              delete component[nm].methods[a].params[p].description;
            }
          }
          if (component[nm].methods[a].params[p].hasOwnProperty('optional')){
            component[nm].methods[a].params[p].required = !component[nm].methods[a].params[p].optional;
          }
        });
      });
      var attr = component[nm].events||{};
      component[nm].events = {};
      Object.keys(attr).sort().forEach(function(a){
        component[nm].events[a] = attr[a];
      });
    });

    // Write the output files
    Object.keys(component).forEach(function(name){
      console.log(('Writing '+path.join(out,name)+'.json').blue.bold);
      fs.writeFileSync(path.join(out,name)+'.json',JSON.stringify(component[name],null,2));
    });

    me.done();
  }

  this.done = function(){
    me.emit('done');
  };
};

// Inherit event emitter
var EventEmitter = require('events').EventEmitter;
require('util').inherits(mod,EventEmitter);

module.exports = mod;
