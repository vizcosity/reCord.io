// DEPENDENCIES
var Discord = require('discord.io');
var Lame = require('lame');
var spawn = require('child_process').spawn;
var fs = require('fs');

// MODULES
var config = require('./config/config.json');
var commandList = require('./commands/commands.js'), commands;
var permissionHandler = require('./config/permissions.js');
var Utility = require('./modules/discord-bot-utility.js');


var shell = false ;
var dev = false;
var token = determineToken(process.argv[2]);
bot = new Discord.Client({
  token: token,
  autorun: true
});

var util = new Utility(bot);

bot.on('ready', function(){
  // Log initialization status.
  var servers = util.printServers();
  console.log("Successfully logged in as " + bot.username + ' - ID: ' + bot.id+servers);

  // Setup interactive console / shell.
  if (shell){
    console.log("Shell initialized.");
    // ENVIRONMENT SETUP
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.on('line', (input) => {
      try {
        eval(input);
      } catch(e){ console.log(e); };
    });
  }
});

bot.on('message', function(user, userID, channelID, message, event){

  // Sets up the environment for command execution.
  util.setEnvironment(channelID, dev);

  // Creates the cmd Object.
  var cmd = util.getCmdObj(user, userID, channelID, message, event);

  // Checks message is valid for execution.
  var validation = util.validate(cmd);
  if (!validation.result) {
    if (validation.reason) return console.log(validation.reason);
    return;
  };

  util.execute(cmd);

});


// FUNCTIONS
function determineToken(CLIarg){
  // Determines if development bot should be initialized.
  if (CLIarg && CLIarg.toLowerCase() === 'dev'){
    if (config['global-dev'].enabled){
      dev = true;
      return config['global-dev'].token;
    } else {
      var output = "";
        rl.question('No Development token found, please enter your token: ', (answer) => {
        console.log(`Attempting to set token: ${answer}`);
        output = answer;
        rl.close();
      });
      return output;
    }
  }

  try {
    if (config && config.global && config.global.token){
      return config.global.token;
    } else {
      rl.question('No token found, please enter your token: ', (answer) => {
        console.log(`Attempting to set token: ${answer}`);
        output = answer;
        rl.close();
      });
    }
  } catch(e){ log.debug("Failed to load token: " + e)};

}
