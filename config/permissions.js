function permissionHandler(bot, serverID){
  var permissions = require('./permissions.json');

  //check if there is an entry in the permissions file for the server.
  if (typeof permissions.servers[serverID] === 'undefined') return log("Server has no permission entry.");
  if (!permissions.servers[serverID].permissionsEnabled) return log("Server has permissions disabled.");

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
