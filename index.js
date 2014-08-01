process.env.config = './config.json';

var cfg = require(process.env.config),
    wrench = require('wrench'),
    repl = require('repl'),
    path = require('path'),
    fs = require('fs'),
    EventEmitter = require('events').EventEmitter,
    EE = new EventEmitter(),
    Builder = require('./lib/builder'),
    builder = new Builder(cfg.output);

// Add colorful output
require('colors');

// Normalize the source (always expect an array)
cfg.source = typeof cfg.source !== 'string' ? cfg.source : [cfg.source];
cfg.timeout = (cfg.timeout || 30)*1000;

// Start a REPL to prevent premature exit and provide interaction during the build process.
repl.start({});

// Identify parsers
var parser = {
  js: require('./lib/parser/js'),
  css: require('./lib/parser/css'),
  html: require('./lib/parser/html')
};

// Process all files in all directories
var html = [];
cfg.source.forEach(function(dir){

  console.log('\n');
  console.log(dir.toUpperCase().bold.underline);

  // Concatenate all the known files
  wrench.readdirSyncRecursive(dir).filter(function(file){
    // Abstract the HTML files so they can be processed asynchronously
    if (['.html','.htm'].indexOf(path.extname(file)) >= 0){
      html.push(path.join(dir,file));
      return false;
    }
    return ['.css','.js'].indexOf(path.extname(file)) >= 0;
  }).map(function(file){
    return path.join(dir,file);
  }).forEach(function(file){
    // Process all synchronous files (CSS/JS)
    var ext = path.extname(file).replace('.','');
    var json = parser[ext](fs.readFileSync(file,'utf8'));
    builder.addContent(ext,file,json);
  });

});

// When the build is complete, exit.
builder.on('done',function(errors){
  if (errors){
    console.log('\nComplete, with errors.'.red.bold);
    console.log(errors);
    process.exit(1);
  }
  console.log('\nComplete, no errors.'.green.bold);
  process.exit(0);
});

// Process the HTML files last (async)
var processedHtml = 0;
html.forEach(function(file){
  var p = new parser.html(fs.readFileSync(file,'utf8'),path.dirname(file));
  p.on('fileprocessed',function(json){
    builder.addContent('html',file,json);
    processedHtml++;
    processedHtml === html.length && builder.build();
  });
  p.process();
});

// Graceful exit upon successful completion.
//EE.on('buildcomplete',function(){
//  console.log('\nComplete, no errors.'.green.bold);
//  process.exit(0);
//});
//
//// Handle each individual process completion
//var completed = 0;
//EE.on('directoryprocessed',function(d){
//  console.log((d+' processed.').blue.bold);
//  completed++;
//  if (completed === cfg.source.length){
//    EE.emit('buildcomplete');
//  }
//});


  // Process JS
//  console.log(' - Processing JavaScript'.cyan.bold);
//  var js = require('./lib/parser/js')(dir);
//
//  // Process CSS
//  console.log(' - Processing CSS'.cyan.bold);
//  var css = require('./lib/parser/css')(dir);
//
//  // The HTML processor is an async processor
//  var HtmlParser = require('./lib/parser/html'),
//    html = new HtmlParser(dir);
//
//  // Once the HTML is retrieved, we have all the assets of the component.
//  html.on('done',function(data){
//    console.log('\nGenerating output...'.bold.cyan);
//    var json = require('./lib/generator')({
//      js: js,
//      css: css,
//      html: data
//    }, function(err){
//      if (err){
//        console.log('\nComplete, with errors.'.red.bold);
//        console.log(err);
//        process.exit(1);
//      }
//      EE.emit('directoryprocessed',dir);
//    });
//  });
//
//  console.log(' - Processing HTML'.cyan.bold);
//  html.process();


// Set a timeout
setTimeout(function(){
  console.log('Process timed out.'.bold.yellow);
  console.log('The timeout can be extended by modifying the timeout attribute of the configuration.'.grey);
  process.exit(1);
},cfg.timeout);
