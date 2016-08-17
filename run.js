var forever = require('forever-monitor');
var config = require('./help.json');

var child = new (forever.Monitor)('main.js', {
  max: 100,
  silent: false,
  args: []
});

child.on('start', function(){
  console.log(config.name + ' instance Successfully started. Loading main.js program now.')
});

child.on('exit', function(){
  console.log('main.js has exited after 3 attempts to restart.');
});

child.on('stdout', function(data){
  if (data.toString().substring(0,13) === '/restartChild'){
    console.log('restarting child proces...')
    child.restart();
  }
})

child.start();
