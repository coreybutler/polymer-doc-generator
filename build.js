process.env.config = './config.json';

var cfg = require(process.env.config),
    wrench = require('wrench'),
    repl = require('repl'),
    path = require('path'),
    fs = require('fs'),
    ejs = require('ejs'),
    tpl = fs.readFileSync(path.join(__dirname,'lib','templates','component.ejs'), 'utf8');

// Read the source directory
wrench.readdirSyncRecursive(cfg.output).forEach(function(json){
  var data = require(path.join(cfg.output,json));
  console.log(ejs.render(tpl,{title:json.replace('.json',''),data:data}));
});
