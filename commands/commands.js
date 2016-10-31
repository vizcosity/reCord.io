function commandList(bot){
  //grab the useful message functions.
  var messenger = require('../snippets/message.js');
  var permissionsInfo = require('../config/permissions.json');
  var permission = require('../config/permissions.js');

  var msg = new messenger(bot);


  //wrap in try to (hopefully) prevent some crashes.
  try {
    //executable commands.
    this.execute = {

      //MISCELLANEOUS COMMANDS

        //roll command
        roll : function(cmd, respond){
          //Roll is a returnable function. If respond is not specified,
          //it will default to true and respond the stringed formatted
          //output to the user. If false, it will just return the output
          //alone and can be used to perhaps make some fun punishment cmds.

          //Setting the default true respond.
          if (typeof respond === 'undefined'){respond=true;}else{respond=false;};

          //find random number from an interval function.
          function randomIntFromInterval(min, max){
              return Math.floor(Math.random() * (max - min + 1)) + min;
          }

          //setting the channelID to where the command came from. (standard)

          var rollNum = randomIntFromInterval(1,100);

          if (respond){
            msg.setCID(cmd.channelID);
            var stringedMessage = ":game_die: <@" + cmd.uID + "> rolled a **" + rollNum + "**! :game_die:";
            msg.send(stringedMessage);
          };

          //return the output.
          return {
            'num': rollNum,
            'userID': respond && typeof cmd !== 'undefined' ? cmd.uID : null
          };
        },//end of roll.

        smug: function(cmd) {
          msg.setCID(cmd.channelID);

          msg.send(cmd.arg);
          console.log(cmd.arg);
        },

        imgur: function(cmd, callback) {
          try {
            var imgurAPI = require('../snippets/imgurAPI.js');
            var imgur = new imgurAPI();
          } catch(e){ log('Failed to load imgur API: ' + e);};
          msg.setCID(cmd.channelID);
          if (typeof cmd.arg === 'undefined'){
            //no arguments have been passed; return a random image.
            imgur.random(function(result){
                  if (typeof result !== 'undefined'){
                    try {
                      var response = "**Random Image**\nTitle: **"+result.title+"**\n:paperclip: "+ result.link;
                      msg.send(response);
                    } catch(e){ log('Problem sending result of imgur search: ' + e)}
                  } else {
                    try {
                      msg.send('No results found.');
                    } catch(e){ log('Problem sending no results found (imgur) message: '+e)}
                  }
            });
          } else {
            //arguments have been passed, search and return the value.
            try {
              imgur.search(cmd.arg, 'random', function(result){
                if (typeof result !== 'undefined'){
                  try {
                    var response = "Searched: **" + cmd.arg + "** :mag:\nFound: **" + result.title+"**\n:paperclip: "+ result.link;
                    msg.send(response);
                  } catch(e){ log('Problem sending result of imgur search: ' + e)}
                } else {
                  try {
                    msg.send('No results found.');
                  } catch(e){ log('Problem sending no results found (imgur) message: '+e)}
                }
              });

            } catch(e){ log('Problem executing imgur search: ' + e);};
          }
        },

        //cleverbot testing
        talk: function(cmd){
          try {
            var convoInstance = require('../snippets/botTalk.js');
            var convo = new convoInstance(bot);
            var convoMessage = cmd.arg;

            convo.ask(convoMessage, cmd.channelID);
          } catch(e){ log('Problem with talk command: ' + e)}
        },

        ping: function(cmd) {
          msg.setCID(cmd.channelID);
          var responses = [
            ":ping_pong: pong!",
            ":ping_pong: **Ouch!** That one actually stung a bit.",
            ":ping_pong: I'm not a ping pong ball!",
            ":ping_pong: YES I'M STILL HERE",
            ":ping_pong: Please be more careful with that. Almost hit me in the eye!"
          ];

          msg.notify(responses[Math.floor(Math.random() * responses.length)]);


        },

      // GENERAL commands

      help: function(cmd){
        // Assign the server ID from the command.
        var permissions = new permission(bot, cmd.sID);

        var commandInfo = require('../config/commands.json'); // Command information is stored here.
        var config = require('../config.json');
        // Returns useful help information.

        // If there are arguments, it is likely that the user is looking
        // for information on a specific command. Check if this command exists
        // and output description & usage. Else, return full help.

        msg.setCID(cmd.channelID);
        if (!cmd.arg){
          // Set the cID to the userID.

          msg.setCID(cmd.uID);
          // Generate normal full help method. (Arguments are empty.)

          function generateHelpList(){
            // Command groups & headers.
            var helpList = {
              introMsg: ":small_orange_diamond:   **reCord** v0.55 **GitHub**: <https://github.com/Vizcosity/discord.gi>\n",
              general: "__**General / Misc**__ :zap:\n",
              playback: "__**Playback / Music**__ :musical_note:\n",
              admin: "__**Administration**__ :tools: :gear:\n"
            };

            // Loop through each command, add each one to respective category.
            for (var key in commandInfo){
              if (!permissions.hasAccess(cmd.uID, key).result) continue;
              var cmdGroup = commandInfo[key].group;
              helpList[cmdGroup] += "**" + config.prefix + key + "** - " + commandInfo[key].desc + '\n';
            }

            // Returns as an array so that each cmd Group is split up and can be
            // sent to the user as a seperate message. (Gets around the char limit.);
            return [helpList.general, helpList.playback, helpList.admin];
          }

          // Send the help message to the user.

          var helpList = generateHelpList();

          // Sends the introductory message first, then the other help messages intermittendly.
          msg.send(":small_orange_diamond: **reCord** v"+ require('../log/changelog.json').ver +" **GitHub**: <https://github.com/Vizcosity/discord.gi>\n",
          false,
          function(){
            for (var i = 0; i < helpList.length; i++){
              msg.send(helpList[i]);
            }
          });


          return;

        } else {

          // Check that the command exists.
          var commandToLookup = cmd.arg;
          if (typeof commandInfo[commandToLookup] !== 'undefined'){
            // The command exists. Return the description & usage.
            var description = ":pencil: **Description**: " + commandInfo[commandToLookup].desc;
            var usage = ":comet: **Usage**: " + config.prefix + commandInfo[commandToLookup].usage;
            var accessLevel = "";
            var access = "";

            try {
              // This will only work if permissions is set up on the server,
              // Otherwise the output will simply be blank.
              accessLevel = "\n\n:closed_lock_with_key: **Access Level**: "
               + commandInfo[commandToLookup].access + " (`" +
               permissionsInfo.servers[cmd.sID].assignment[commandInfo[commandToLookup].access].name + "`)";
            } catch(e){ console.log(e) };

            try {
              access = permissions.hasAccess(cmd.uID, commandToLookup).result
              ? "\n\n :white_check_mark: **You have access to this command.**"
              : "\n\n :no_entry: **You do not have access to this command:**\n\n:small_red_triangle_down: **Reason**: " +
              permissions.hasAccess(cmd.uID, commandToLookup).reason;
            } catch(e) { console.log(e) };
            // var access =

            var formattedResponse = description + '\n\n' + usage + accessLevel + access;

            msg.notify(formattedResponse, 60000);
          }

        }


      },

      //Administration

        //edit nickname
        nickname: function(cmd){
          msg.setCID(cmd.channelID);
          var serverID = bot.channels[cmd.channelID].guild_id;
          var newNickname = cmd.arg.split(' ')[1];
          var mentions = cmd.event.d.mentions;
          if (mentions.length === 0) return msg.notify(':warning: Please mention a user to change their nickname.');

          //Have more than one user been selected?
          var multipleUsers = cmd.event.d.mentions.length > 1 ? true : false;
          if (multipleUsers) return msg.notify(':warning: Please choose one user at a time.\n\nMultiple user nickname change is being implemented soon.');

          //only change one user's nickname.
          var userToNickID = cmd.event.d.mentions[0].id;
          var userToNickUsername = bot.users[userToNickID].username;

          //Check if the user has permission to use this.
          var permissions = permissionCheck(cmd.uID, this.toString(), cmd.arg);
          var hasPermission = permissions.hasPermission;
          var permissionScope = permissions.scope;
          if (!hasPermission){
            msg.notify('Sorry **'+cmd.user+'** but you do not have permission to use this command.');
            return log(cmd.user + ' did not have permission to execute ' + this.toString());
          }

          //Check the scope of the permission to use this.
          if (permissionScope === 'self'){
            if (userToNickID !== cmd.uID) msg.notify(':x: You only have permission to change your own nickname.'); return log(cmd.user + ' tried to nickname someone else [NO PERMISSION]');
          }

          if (isProtected(userToNickID, this.toString())){
            log(cmd.user + " tried to nick " + userToNickUsername + " but was protected.");
            return msg.notify("**" + userToNickUsername+"** is protected from nickname changes. Likely has it turned off.\n\nIf you're wondering, you can do the same with the allownick command.");
          }

          //change nickname;
          bot.editNickname({
            serverID: serverID,
            userID: userToNickID,
            nick: newNickname
          }, function(err, response){
            if (err !== null) {log(err); msg.notify("I encountered an error trying to change **" + userToNickUsername+"'s** nickname.\n\nDetails: " + err)}
            else {msg.notify('Succesfully changed **'+userToNickUsername+"'s** to **"+newNickname+"**.")}
          });
        }
    }




  } catch(e){ log(e); };

  //logging function
  function log(msg){
    console.log('[COMMAND] ' + msg);
  };
};

module.exports = commandList;


/*  var cmd = {
    sID: serverID,
    message: channelMsg,
    rawMessage: message,
    arg: null, //this will be changed when passed into the neCommand function.
    user: user,
    uID: userID,
    channelID: channelID //channelID origin for the command message.
  };
  Command info object structure.
*/
