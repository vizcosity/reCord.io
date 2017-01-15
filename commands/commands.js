function commandList(bot){

  // External (to this file) Commands and snippets.
  var external = {
    command: {
      shortcut: require('./shortcut.js')
    },
    snippet: {
      messenger: require('../snippets/message.js'),
      permissions: require('../config/permissions.js'),
      voicerecordings: require("../snippets/voicerecordings.js"),
      hasSubCommands: require('../snippets/hasSubCommands.js'),
      scrape: require('../snippets/channelMessageScraper.js'),
      markov: require('../snippets/markovGen.js')
    },
    config: {
      permissions: require('../config/permissions.json'),
      config: require('../config/config.json'),
      subCommands: require('../config/subCommands.json')
    },
    module: {
      voice: require('../modules/voice.js'),
      queue: require('../modules/queue.js'),
      chatSimulator: require('../modules/chatSimulator')
    }
  }
    var permissionsInfo = require('../config/permissions.json');
    var permission = require('../config/permissions.js');

    // Set up instance of messenger.
    var msg = new external.snippet.messenger(bot);

    // Global voice variable.
    var voice = {};

    // Simulation global var.
    var simulating = {};

  // Wrap in try to (hopefully) prevent some crashes.
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

        simulate: function(cmd){
          // msg.setCID(cmd.cID);
          // if (simulating[cmd.cID]) return msg.error("I'm already simulating a user in this channel. Do "+cmd.prefix+"stopsimulation to stop.");
          // simulating[cmd.cID] = true;
          // var channelToSimulate = cmd.cID;
          // var userToSimulate = cmd.event.d.mentions.length > 0 ? cmd.event.d.mentions[0].id : false;
          // if (userToSimulate && !bot.users[userToSimulate]) return msg.error("Could not find user.");
          //
          // var simulationMode = userToSimulate ? "user" : "channel"
          //
          // msg.notify("Grabbing messages from " + simulationMode + ": "+ (userToSimulate ? bot.users[userToSimulate].username : bot.channels[cmd.cID].name) + " from this text channel. This could take a while.");
          //
          // external.snippet.scrape(bot, cmd.cID, function(messages){
          //
          //   // Check that there are available messages if user:
          //   if (userToSimulate && !messages[userToSimulate]) return msg.error("Could not find messages by this user in this text channel.");
          //
          //   var fullText = "";
          //
          //   var targetedArray = userToSimulate ? messages[userToSimulate].messages : messages.channelText;
          //
          //   for (var i = 0; i < targetedArray.length; i++){
          //     var cm = userToSimulate ? targetedArray[i] : targetedArray[i].content;
          //
          //     // Filter out links
          //     if (cm.indexOf("http") != -1) continue;
          //
          //     // Filter out common commands.
          //     if (cm.substring(0,1) == ">") continue;
          //     if (cm.substring(0,1) == "<") continue;
          //     if (cm.substring(0,1) == "!") continue;
          //     if (cm.substring(0,1) == "?") continue;
          //     if (cm.substring(0,2) == "++") continue;
          //     if (cm.substring(0,1) == "+") continue;
          //     if (cm.substring(0,1) == "/") continue;
          //     if (cm.substring(0,cmd.prefix.length) == cmd.prefix) continue;
          //
          //
          //     fullText += " "+cm;
          //   }
          //
          //   // console.log(fullText);
          //
          //   var username = userToSimulate ? messages[userToSimulate].name : null;
          //
          //   msg.notify("Messages obtained. Running comprehension...");
          //
          //   try {
          //     continuousMarkovConvo(fullText, 5, 60, function(){
          //       // This runs once it's done.
          //       msg.notify("Simulation finished");
          //     });
          //   } catch(e){log("Markov Simulation: " + e)}
          //
          //   function continuousMarkovConvo(fullText, order, limit, callback){
          //     if (!simulating[cmd.cID]) {
          //       return callback();
          //     };
          //
          //   function formatMarkovText(text){
          //     // Capitalize the first letter, end with a fullstop.
          //     text = text.substring(0,1).toUpperCase() + text.substring(1, text.length);
          //     text += ".";
          //     return text;
          //   }
          //
          //     external.snippet.markov(fullText, order, limit, function(markovText){
          //       // console.log(markovText);
          //       markovText = formatMarkovText(markovText);
          //       msg.send((userToSimulate ?  "**"+username+"**: " : "") + markovText, true, function(){
          //         continuousMarkovConvo(fullText, order, limit, callback);
          //       });
          //     });
          //
          //   }
          //
          // });

          // Exit if already running
          if (simulating[cmd.cID])
            return msg.error("I'm already simulating a user in this channel. Do "+cmd.prefix+"stopsimulation to stop.");

          simulating[cmd.cID] = new external.module.chatSimulator(bot, cmd);

        },

        stopsimulation: function(cmd){
          msg.setCID(cmd.cID);

          if (!simulating[cmd.cID]) return msg.error("No simulation running on this channel.");

          simulating[cmd.cID].kill(cmd, function(){
            log("Chat Sim on: "+cmd.cID+" killed.");

            // Reset the simulating instance.
            simulating[cmd.cID] = false;
          });
        },

        imgur: function(cmd, callback){
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

          var userMsgTimestamp = cmd.event.d.timestamp;
          var userMS = userMsgTimestamp.split('.')[1].split('+')[0].substring(0,3);
          var pingMessage = responses[Math.floor(Math.random() * responses.length)];

          bot.sendMessage({
            to: cmd.channelID,
            message: pingMessage
          }, function(err, res){
            // This will detect the 'ms' delay between messages.

            // Get the timestamp of the command message.

            // Grab the message id, and edit it to append the delay in 'ms'.
            try {
              if (err) console.log(err);
              var msgID = res.id;
              var botMsgTimestamp = res.timestamp;
              var botMS = botMsgTimestamp.split('.')[1].split('+')[0].substring(0,3);

              var latency = (parseInt(botMS) - parseInt(userMS)) > 0 ?
              parseInt(botMS) - parseInt(userMS) : '1000+';
              var latencyString = '`'+latency + ' ms`';

              bot.editMessage({
                channelID: cmd.channelID,
                messageID: msgID,
                message: pingMessage + ' ' + latencyString
              });

            } catch(e){ log('[PING LATENCY] ' + e)}
          });

        },

      // GENERAL commands

      help: function(cmd){
        // Assign the server ID from the command.
        var permissions = new external.snippet.permissions(bot, cmd.sID);

        var commandInfo = require('../config/commands.json'); // Command information is stored here.
        external.config.config = require('../config/config.json'); // Update config file in case prefix has changed.
        var config = external.config.config; // Shorter reference to config file.

        // Returns useful help information.

        // If there are arguments, it is likely that the user is looking
        // for information on a specific command. Check if this command exists
        // and output description & usage. Else, return full help.

        msg.setCID(cmd.channelID);
        if (!cmd.arg){
          // Generate normal full help method. (Arguments are empty.)

          // Set the cID to the userID.
          msg.setCID(cmd.uID);

          function generateHelpList(){
            try {
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
                helpList[cmdGroup] += "**" + cmd.prefix + key + "** - " + commandInfo[key].desc + '\n';
              }

              // Returns as an array so that each cmd Group is split up and can be
              // sent to the user as a seperate message. (Gets around the char limit.);
              return [helpList.general, helpList.playback, helpList.admin];
            } catch(e){ log(e); }
          }

          // Send the help message to the user.

          var helpList = generateHelpList();

          // Sends the introductory message first, then the other help messages intermittendly.
          msg.send(":small_orange_diamond: **reCord** v"+ require('../log/changelog.json').ver +" **GitHub**: <https://github.com/Vizcosity/discord.gi>\n:small_blue_diamond: **Invite me to your server**: " + bot.inviteURL,
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
            var usage = ":comet: **Usage**: " + cmd.prefix + commandInfo[commandToLookup].usage;
            var accessLevel = "";
            var access = "";

            try {
              // This will only work if permissions is set up on the server,
              // Otherwise the output will simply be blank.
              accessLevel = "\n\n:closed_lock_with_key: **Access Level**: "
               + commandInfo[commandToLookup].access + " (`" +
               external.config.permissions.servers[cmd.sID].assignment[commandInfo[commandToLookup].access].name + "`)";
            } catch(e){ console.log(e) };

            try {
              access = permissions.hasAccess(cmd.uID, commandToLookup).result
              ? "\n\n :white_check_mark: **You have access to this command.**"
              : "\n\n :no_entry: **You do not have access to this command:**\n\n:small_red_triangle_down: **Reason**: " +
              permissions.hasAccess(cmd.uID, commandToLookup).reason;
            } catch(e) { console.log(e) };

            var formattedResponse = description + '\n\n' + usage + accessLevel + access;

            // Pretty embed response.
            msg.embed({
              title: "Help Info",
              type: "rich",
              description: formattedResponse,
              author: {
                name: "Command Info for: "+commandToLookup,
                icon_url: "http://image.flaticon.com/icons/png/128/25/25400.png"
              },
              color: "1146534"
            });

            // log("Has subcommands: " + (external.snippet.hasSubCommands(commandToLookup)));
            if (external.snippet.hasSubCommands(commandToLookup)){
              var output = "**Available SubCommands for "+commandToLookup+"**:";
              for (var key in external.config.subCommands[commandToLookup]){
                if (key == 'path') continue;
                output += "\n**"+cmd.prefix+commandToLookup+" "+cmd.prefix+key+"**: "+external.config.subCommands[commandToLookup][key].desc;
              }
              msg.embedNotify(output, null, 60000);
            }

          }

        }

      },

      shortcut: function(cmd){
        external.command.shortcut(cmd, msg)
      },

      // De references command to external function.
      // shortcut: external.shortcutHandler(cmd),

      //Administration

        // Edit nickname [Partial implementation]
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
        },

        queue: function(cmd){
          voiceFunction(cmd, function(voice){
            voice.queue(cmd);
          });
        },

        play: function(cmd){
          voiceFunction(cmd, function(voice){
            voice.queue(cmd);
          });
        },

        q: function(cmd){
          voiceFunction(cmd, function(voice){
            voice.queue(cmd);
          });
        },

        skip: function(cmd){
          log("Recieved skip request.");
          voiceFunction(cmd, function(voice){
            voice.skip(cmd);
          });
        },

        recordstart: function(cmd){
          log("RECORD REACHED. Attempting to instantiate.");
          voiceFunction(cmd, function(voice){
            voice.recordStart(cmd);
          });
        },

        leavevoice: function(cmd){
          if (voice[cmd.sID]){
              // log("Attempting to leave voice");
              return voice[cmd.sID].leaveVoice(cmd);
              // Clear the voice object after leaving.
              //return voice[cmd.sID] = null;
           };

          msg.setCID(cmd.cID);
          msg.error("Not in a voice channel.");
          return;
        },

        joinvoice: function(cmd){
          voiceFunction(cmd, function(voice){
            voice.joinVoice(cmd);
          });
        },

        recordstop: function(cmd){
          // console.log("recordstop cmd exec order reached.");
          voiceFunction(cmd, function(voice){
            voice.recordStop(cmd);
          });
        },

        recordings: function(cmd){
          external.snippet.voicerecordings(cmd);
        },

        audio: function(cmd){
          voiceFunction(cmd, function(voice){
            voice.playAudio(cmd, {leave: true});
          });
        }


    }



    // Ease of use voiceFunction which checks environment before executing particular function.
    function voiceFunction(cmd, callback){

      // Check for callback.
      if (!callback) return log("No callback found for voice function.");

      // Checks the voice environment, sets up a new instance if it doesn't exist,
      // executes command afterwards appropriately if the setup is needed.

      // If voice is not initiated for the current server, initiate it.
      if (!voice[cmd.sID]) voice[cmd.sID] = new external.module.voice(bot, cmd.cID, cmd.sID, cmd.uID, function(){
          // Run the callback if there is one.
          if (callback)  return callback(voice[cmd.sID]);
        });
      else {
        // The voice instance is running.
        if (callback) return callback(voice[cmd.sID]);
      }
      //return callback(voice[cmd.sID]);
    }

  } catch(e){ log(e); };

  // Logging function
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
