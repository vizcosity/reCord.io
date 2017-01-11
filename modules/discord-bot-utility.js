
/**
 * utility - A set of useful command snippets for running the discord bot.
 *
 * @return {type}  void
 * @param {type} bot current bot instance.
 */
function utility(bot, dev){

  var debug = false;
  var self = this;
  // var dev = false;

  // MODULES
  var config = require("../config/config.json");
  var commandList = require("../commands/commands.js");
  var commands = require("../config/commands.json");
  var permissionHandler = require("../config/permissions.js");

  //INSTANCING
  var log = new logger(debug);
  var command = new commandList(bot);
  var permission; // This will be instanced when serverID is assigned.

  // Anounce utility initialised.
  log.debug('Utility initialized.');

  // Function-global variables.
  this.serverID;
  this.channelID;
  this.prefix;

  this.setDebug = function(){
    if (!debug) debug = true;
    else debug = false;
    console.log("Debug set to: " + debug);
  }

  this.printServers = function(){
    try {
      var servers = '';
      for (var key in bot.servers) {
        servers += '\n'+bot.servers[key].name+': ' +
        key + ' [' + Object.keys(bot.servers[key].members).length + ']';
      }
      return servers;
    } catch(e){
      return "\nNot part of any servers.";
    };
  }

  this.getCmdObj = function(user, userID, channelID, message, event){

    // Return built cmd object.
    return {
      sID: this.serverID,
      message: message,
      name: getCmdName(message, self.prefix),
      arg: getCmdArguments(message, self.prefix), // This will be changed when passed into the and function.
      user: user,
      uID: userID,
      channelID: channelID,
      cID: channelID,
      event: event,
      //util: self,
      // Check if the server has set a prefix, and assign it.
      prefix: self.prefix
    }

  }

  this.getCmdName = function(message, prefix){
    try {
      console.log("command message: "+ message + " prefix: " + prefix);
      return getCmdName(message, prefix);
    } catch(e){console.log("Getting cmd name: " + e)}
  }

  this.setEnvironment = function(channelID, dev){

    try {
      self.setServerID(self.getServerID(channelID));
    } catch(e) {log.debug("Fatal error assigning ServerID (setEnv): " + e)};

    try {
      self.channelID = channelID;
    } catch(e){ log.debug("Fatal error assigning ChannelID (setEnv): " + e)};

    try {
      self.prefix = self.getPrefix();
    } catch(e){ log.debug("Fatal error assigning prefix (setEnv): " + e)};

    self.dev = dev;

  }

  this.setServerID = function(channelID){
    try {
      self.serverID = self.getServerID(channelID);
    } catch(e){ log.debug("Fatal error assigning ServerID: " + e)}
  }

  this.getServerID = function(channelID){
    try {
      return bot.channels[channelID].guild_id;
    } catch(e){ log.debug("Fatal error grabbing serverID: " + e);};
  }

  this.getPrefix = function(){
    try {
      var serverID = self.serverID;

      if (dev && config['global-dev'].prefix){
        return config['global-dev'].prefix;
      }

      if (config.server && config.server[serverID]){
        return config.server[serverID].prefix;
      } else {
        return config.global.prefix;
      }
    } catch(e){
      // Worst case scenario, default prefix '>' is returned.
      log.debug("Error getting prefix for: " + self.serverID + " reverting to default, '>' ");
      return ">";
    }
  }

  this.validate = function(cmd){
    // Takes in the cmd Obj, validates to check if it should be ignored.

      // CHECK FOR BOT.
      try {
        if (bot.users && bot.users[cmd.uID] && bot.users[cmd.uID].bot){
          // User is a bot.
          var reason = debug ? "User is a bot." : null;
          return {
            result: false,
            reason: reason
          }
        }
      } catch(e){ log.debug("CMD validation: " + e)};

      // CHECK FOR PREFIX.
      try {
        var message = cmd.message;
        if (!containsPrefix(message, self.getPrefix())){
          var reason = debug ? "Cmd does not contain prefix." : null;
          return {
            result: false,
            reason: reason
          }
        }
      } catch(e) {log.debug("CMD validation: " + e)};

    return {
      result: true,
      reason: null
    }
  }

  this.execute = function(cmd){
    // Set up permissions instancing.
    if (!permission) permission = new permissionHandler(bot, self.serverID);

    // If command exists, proceed to check perms & execute.
    // if (commands[cmd.name]){

      if (!permission.hasAccess(cmd.uID, cmd.name).result){
        log.debug("User: " + cmd.user + ": " + cmd.uID + " does not have permission to execute " + self.prefix + cmd.name );
        return bot.sendMessage({to: cmd.cID, message: '', embed: {
          type: "rich",
          color: "16729871",
          author: {
            icon_url: "http://www.copypastesymbol.com/wp-content/uploads/2016/07/1f6ab.png",
            name: "Insufficient Permissions"
          },
          description: permission.hasAccess(cmd.uID, cmd.name).reason
        }})
      }

      // Attempt to assign permissions instance to cmd object.
      try {
        cmd.permissions = permission;
      } catch(e){log.debug("Assinging permission to cmd obj: " + e)}

      // Attempt to execute.
      try {
        command.execute[cmd.name](cmd);
      } catch(e) {log.debug("[CMD EXECUTION] " + e)};

    // }
  }

  this.containsPrefix = function(input){
    console.log("Checking prefix for " + input);
    return containsPrefix(input, self.getPrefix());
  }

  this.setStatus = function(input){
    var status = input ? input : self.getPrefix() + " | Ready.";
    bot.setPresence({
        game : {
          name: status
        }
      });
  }
}

function logger(debug){
  this.debug = function(message){
    if (debug){
      console.log("[DEBUG > UTIL] " + message);
    }
  }
}

function containsPrefix(message, prefix){
  return message.substring(0, prefix.length) == prefix;
}

function getCmdName(message, prefix){
  return message.substring(prefix.length, message.length).split(' ')[0];
}

function getCmdArguments(message, prefix){
  var preCmd = message.substring(0, prefix.length + getCmdName(message, prefix).length + 1);
  return message.substring(preCmd.length, message.length);
}

module.exports = utility;
