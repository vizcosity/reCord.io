// SUB COMMAND MODULE.

// Dependencies
var subCommands = require('../config/subCommands.json');
var permissionsInfo = require('../config/permissions.json');
var messenger = require('../snippets/message.js');

// External modules
var permission = require('../config/permissions.js');
function subCommand(bot, serverID, parent, callback){
  try {
    // Takes in the bot object, and the name of the parent command, e.g. 'queue'.
    // Runs some permissions checks and sets up the environment for subcommands.
    // Takes a callback which attaches an object passed into the parameter with some accessible related commands
    // Such as from sub_queue.js.

    // Load the subcommands available.
    var subCommands = loadCommands(parent);

    // Set up instance of messenger.
    var msg = new messenger(bot);

    // Error handling in case the subcommands can't load.
    if (!subCommands) {
      log("Could not load subcommands for: " + parent);
      return msg.error("I couldn't load the subcommands for: " + parent)
    };

    // Load permissions.
    var permissions = new permission(bot, serverID);

    // Check for callback.
    if (!callback) return log("Couldn't find callback for subcommand handler.");


    // Return the callback with the paramater that can be used to access subcommands.
    callback({
      execute: function(cmd, optionalModule){
        msg.setCID(cmd.cID);
        if (!cmd.sub) cmd = buildSubCmdObjFromRegCmd(cmd);
        if (!permissions.hasSubAccess(cmd.uID, parent, cmd.name).result)
          return bot.sendMessage({to: cmd.cID, message: '', embed: {
            type: "rich",
            color: "16729871",
            author: {
              icon_url: "http://www.copypastesymbol.com/wp-content/uploads/2016/07/1f6ab.png",
              name: "Insufficient Permissions"
            },
            description: permissions.hasSubAccess(cmd.uID, parent, cmd.name).reason
          }});

        // Command should have been validated at this point & subcommands should have also been loaded, so should be safe to execute.
        try {
          if (optionalModule) return subCommands[cmd.name](cmd, optionalModule);
          subCommands[cmd.name](cmd);
        } catch(e){log("Error executing sub-command "+cmd.name+": " + e)}
      }
    });
  } catch(e){log(e)}
}

function buildSubCmdObjFromRegCmd(cmd){
  try {
    cmd.message = cmd.arg;
    cmd.name = getCmdName(cmd.arg, cmd.prefix);
    cmd.arg = getCmdArguments(cmd.arg, cmd.prefix);
    cmd.sub = true;
  } catch(e){log("Building subCommand object: " + e)}

  // If build fails the original cmd will be returned.
  return cmd;

}

function validSubCommand(cmd){
  try {
    // log("Checking prefix: " + containsPrefix(cmd.arg, cmd.prefix) +" subcomexists: " + subCommandExists(getCmdName(cmd.arg, cmd.prefix)));
    return containsPrefix(cmd.arg, cmd.prefix) && subCommandExists(getCmdName(cmd.arg, cmd.prefix));
  } catch(e){log("Validating sub command: " + e)}
}

function containsPrefix(message, prefix){
  try {
    return message.substring(0, prefix.length) == prefix;
  } catch(e){log("Checking if contains prefix: " + e)}
}

function getCmdName(message, prefix){
  try {
    return message.substring(prefix.length, message.length).split(' ')[0];
  } catch(e){ log("Getting command name: " + e)}
}


function getCmdArguments(message, prefix){
  try {
    var preCmd = message.substring(0, prefix.length + getCmdName(message, prefix).length + 1);
    return message.substring(preCmd.length, message.length);
  } catch(e){log("Getting cmd arguments: " + e)}
}

function subCommandExists(command){
  try {
    if (subCommands[parent] && subCommands[parent][command]) return true;
    return false;
  } catch(e){log("Checking subcommand existance: " + e)}
}

function loadCommands(parent){
  try {
    var outputObject;
    log("sub-command-module-path: " + subCommands[parent].path);
    outputObject = require(subCommands[parent].path);
    log("Loaded subCommand module: " + parent + " from: " + subCommands[parent].path);

    if (Object.keys(outputObject).length == 0) return log("Could not load any subcommands for: " + parent);
    return outputObject;
  } catch(e){log("Loading subcommand: " + e)}
}

function log(message){
  console.log("[SUBCOMMANDS.JS] " + message);
}

module.exports = subCommand;
