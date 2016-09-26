function commandList(bot){
  //grab the useful message functions.
  var messenger = require('../snippets/message.js');
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

            setTimeout(function(){
              convo.ask(convoMessage, cmd.channelID);
            }, 3000)
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
