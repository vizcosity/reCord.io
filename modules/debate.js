// This is the debate module which has useful functions in relation to debate simulator.
var fs = require('fs');
module.exports = {
  updateInfoListener: function(bot, info){

    bot.on('any', function(event){
      // Checks topic and people in voice chat and updates stream info accordingly.
      if (event.t == 'CHANNEL_UPDATE' && event.d.id == info.debateChannelID){
        var newTopic = event.d.topic;
        // The topic has been changed.
        log("Topic likely has been changed (Channel Update). Updating to: "+newTopic);

        // try {
          fs.writeFile("./DebateAssets/Topic.txt", newTopic, function(err){
            if (err) {console.log(err); return bot.sendMessage({to: info.logChannelID, message: "Could not update debate topic: "+err});}
            bot.sendMessage({to: info.logChannelID, message: "Debate Topic Updated to: "+newTopic});
          });

          // fs.writeFile('../DebateAssets', JSON.stringify(alias, null, 2), function callback(err){
          //   if (err !== null){console.log(err)};
          //   log('File write completed Successfully. New Alias: ' + shortcutName + " added which runs: " + alias.shortcutName);
          //   respond('New Alias: ' + shortcutName + ' now added. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
          // });
        // } catch(e){log("Writing Topic File: "+e)};

      }

      // Update active Player names.
      // When a new user joins the debate voice channel, then update the player names on stream.
      if (event.t == 'VOICE_STATE_UPDATE' && event.d.channel_id == info.debateVoiceID){
        var player1 = {
          name: null,
          stance: null,
          avatar: null
        };

        var player2 = {
          name: null,
          stance: null,
          avatar: null
        }

        var voiceUsers = bot.channels[info.debateVoiceID].members;

        for (var key in voiceUsers){
          if (key !== bot.id && key !== info.otherBotID){
            // Valid user has joined the channel.

            if (!player1.name) {
              player1.name = bot.users[key].username;
              continue;
            }

            if (!player2.name) {
              player2.name = bot.users[key].username;
              continue;
            }


          }
        }

        // Update player 1 name.
        fs.writeFile('./DebateAssets/Player 1.txt', player1.name ? player1.name : 'Player 1', function(err){
          if (err) return bot.sendMessage({to: info.logChannelID, message: "Could not update Player 1 name: " + err});
          bot.sendMessage({to: info.logChannelID, message: "Player 1 name updated to: " + (player1.name ? player1.name : 'Player 1')});
        });

        // Update player 2 name.
        fs.writeFile('./DebateAssets/Player 2.txt', player2.name ? player2.name : 'Player 2', function(err){
          if (err) return bot.sendMessage({to: info.logChannelID, message: "Could not update Player 2 name: " + err});
          bot.sendMessage({to: info.logChannelID, message: "Player 2 name updated to: " + (player2.name ? player2.name : 'Player 2')});
        });

      };

    }); // End of event listener



  }
}


function log(message){
  console.log("[DEBATE.js] "+message);
}
