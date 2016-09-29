function permissionHandler(bot, serverID){
  var permissions = require('./permissions.json');
  var commands = require('./commands.json');
  var enabled = true;

  //check if there is an entry in the permissions file for the server.
  if (typeof permissions.servers[serverID] === 'undefined') {
    enabled = false;
    log("Server: "+ bot.servers[serverID].name" has not been configured for permissions.");
  }
  if (!permissions.servers[serverID].permissionsEnabled) {
    enabled = false;
    log("Server has permissions disabled.");
  }

  // Checks if the user has plain access to the core command.
  this.hasAccess(userID, command){
    // Check that the command is configured for permissions.
    if (typeof commands[command] === 'undefined' || !enabled){
      log('Failed to check for command access. Command Defined: ' + typeof commands[command] + ' enabled: ' + enabled);

      // Return default true if access level required is 3 or less.
      if (!enabled) {
        if (commands[command].access <= 3){
          return {
            result: true,
            reason: null;
          };
        } else {
          return {
            result: false,
            reason: "Using this command requires permissions setup."
          };
        }
      };

      //if the command does not exist in permissions but premissions is enabled, allow only bot-master to use.
      if (typeof commands[command] === 'undefined'){
        var accessLevel6Role = permissions.server[serverID].assignment['6'].id;
        if (hasRole(userID, accessLevel6Role)){
          return {
            result: true
          };
        } else {
          return {
            result: false,
            reason: "Permissions not configured for this command.\nOnly bot-master can use it until it is configured."
          };
        }
      }

    }

    // Handle for commands that are registed, and permissions are enabled.
    var commandAccessLevel = commands[command].access;
    var requiredRoleForAccessLevel = permissions.server[serverID].assignment[commandAccessLevel]; // Append ID

    if (!hasRole(userID, requiredRoleForAccessLevel.id)){
      // User does not have requried permission.
      return {
        result: false,
        reason: "You need access level "+commandAccessLevel+", as part of role: "+requiredRoleForAccessLevel.name+"to use this."
      };
    } else {
      // User has permission to use command.
      return {
        result: true,
        reason: null
      }
    }


  }

  // Checks if the user has scope to access feature of a command.
  this.hasScope(userID, command, scope){
    // Return false if any arguments are undefined.
    if (!userID || !command || !scope){
      return {
        result: false,
        reason: "Undefined arguments."
      }
    };

    // Check if user has access to the core command first.
    var hasAccessCached = hasAccess(userID, command);
    if (!hasAccessCached.result){
      return {
        result: hasAccessCached.result,
        reason: bot.users[userID].name + ": " + userID+" does not have access to that command.\n"+hasAccessCached.reason
      }
    }

    // Assuming that the user does have access, check the scope availability.
    var commandScopes = commands[command].scope;

    // Return true if the command does not have any scopes and user meets access-level.
    if (commandScopes === 'none' || !commandScopes) return {result: true, reason: 'No scopes set for command.'};

    // Check available scopes;
    var usersRole = bot.servers
    var usersAccessLevel =
  }

  function hasRole(userID, role){
    try {
      var userRoles = bot.servers[serverID].members[userID].roles;

      // Loop through the roles array and check if the desired role exists.
      for (var i = 0; i < userRoles.length; i++){
        var cr = userRoles[i];
        if (cr === role){
          return true;
          break;
        }
      }// Finish loop.

      // If role is not found, return false.
      return false;
    } catch(e){ log('Role Checking: '+e) return false;}
  }


  function updatePermissions(){
    //updates the rank-enabled role names for the server.
    var rankRoles = permissions.servers[serverID].assignment;

    for (var key in rankRoles){
      var currentRoleID = rankRoles[key].id;
      rankRoles[key].name = bot.servers[serverID].roles[currentRoleID].name;
    };

  }

  function log(x){
    console.log('[PERMISSION HANDLER] ' + x)
  }
}

module.exports = permissionHandler;
