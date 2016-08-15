var Discord = require('discord.io');
var http = require('http');
var b64encode = require('base64-stream').Encode;

var fs = require('fs');

var config = require('./config.json');
var help = require('./help.json');

var prefix = config.prefix;

var bot = new Discord.Client({
  token: "MjA1MzkxMTI2MjkzNzc0MzM2.CpJbog.TH8o86o4pIoHghC6_U2H3xQwJKg",
  autorun: true
});

bot.on('ready',function(){
  console.log("Successfully logged in as " + bot.username + ' - ' + bot.id);
  //check if bot username matches config filename;
  if (bot.username !== config.name){

    bot.editUserInfo({
      username: config.name
    }, function callback(err){
      if (err !== null) {console.log(err);};
    })
    console.log('Bot name changed to: ' + config.name );

  }
  bot.sendMessage({
    to: '151051305295675395',
    message: config.name + ' Successfully loaded.'
  })

});

bot.on('message', function(user, userID, channelID, message, event){




if (message.substring(0,1) === prefix){//message contains cmd prefix, proceed to cmd methods;
//main command list methods;

/* if (channelID !== '151051305295675395'){
  respond("Oi, hop on over to #bot-chat to use the bot. Let's keep the rest of the chats tidy.", channelID)
} else { */

      if (message.substring(0,6) === prefix + 'purge'){ //purge cmd;
        //if message contains '!purge', proceed to purgeCmd method;
        purgeCmd(message, channelID, user, userID);
      };//end conditional to check for '!purge';

      //set global cmd prefix;

      if (message.substring(0,10) === prefix + 'setprefix'){
        setprefixCmd(user, userID, channelID, message);
      }

      //basic responses;
        switch (message) {
          case prefix + 'ping':
            respond('pong',channelID);
            break;

          case prefix + 'help':
          //<prefix>help command;
            bot.sendMessage({
              to: userID,
              message: generateHelp()
            });
            break;

          case prefix + 'channelid':
            respond('ChannelID: ' + channelID, channelID)
            break;

          default:
      }//end basic responses

      //restart bot method / command;

      if (message.substring(0, message.length) === prefix + 'restart'){
          bot.sendMessage({
            to: channelID,
            message: 'Bot restarting now.'
          }, function callback(err){
            if (err !== null){console.log(err)};
              console.log('/restartChild');
          });
      }//end restart bot method

      //set username method;
      if (cmdIs('setusername', message) && getArg(prefix + 'setusername', message, channelID).length > 0){
        var newUsername = getArg(prefix + 'setusername', message);
        config.name = newUsername;
        console.log('Bot Username changing to: ' + newUsername + '.')
        fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
          if (err !== null){console.log(err)};
          console.log('File write completed Successfully. New username: ' + newUsername + ' now applied.');
          respond('New username: ' + newUsername + ' now applied. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
        });
      }

      //debug console method;
      if (cmdIs('dc', message)){
        var command = getArg(prefix + 'dc', message, channelID);
        console.log(command);
        (function() {
            command;
        })();
      }


    }//end conditional for checking command prefix, other messages ignored.
  //}//end check channel conditional.
}); // end on 'message' event.










//FUNCTIONS;

//respond function:
      function respond(msg, channelID, user, userID){

        bot.sendMessage({
          to: channelID,
          message: msg
        }, function callback(error){
          if (error !== null){
            console.log(error)
          }
        })

      }

//purge function logic
      function purgeCmd(message, channelID, user, userID){


        if (message === prefix + 'purge'){
            bot.sendMessage({
              to: channelID,
              message:  help.usage['purge']
            });

    }
        // start purge method
          var purgeArg = parseInt(getArg(prefix + 'purge', message, channelID));
          var amtToDelete;
          if (isNaN(purgeArg) !== true){

              amtToDelete = purgeArg;
            } else {
              amtToDelete = 'Not Number'
            }
  //proceed to purge method;

          if (amtToDelete !== 'Not Number'){

            bot.getMessages({
              channelID: channelID,
              limit: amtToDelete
            }, //end get msgs
              //callback with gotten msgs
            function callback(err,arr){
              if (err !== null){console.log(err)};
                var delArr = [];
                for (var i = 0; i < arr.length; i++){
                  delArr.push(arr[i].id);
              }
              if (delArr.length === arr.length){
                console.log(user + ' deleted ' + amtToDelete + ' messages in ' + channelID + '.');
                bot.deleteMessages({
                  channelID: channelID,
                  messageIDs: delArr
                }, function delCallback(err, resp){
                  if (err !== null){

                    console.log(err)
                    bot.sendMessage({
                      to: channelID,
                      message: 'No puedo b0ss, problemo: ' + err.response.message
                    })
                  };



                })//end delArr func;
              }//end conditional to see if delArr is as long as arr;
            }//end callback;
          )//end getMessages func;
        } else {
            bot.sendMessage({
              to: channelID,
              message: '```Please ensure that you have entered a number for the amount of messages to purge.```'
            })
          };
          //finish purge method
      }

//setglobal prefix method;
  function setprefixCmd(user, userID, channelID, message){

    var newPrefix = getArg(prefix + 'setprefix', message);
    console.log(newPrefix);
    bot.sendMessage({to: channelID, message: 'Setting new command prefix: ' + newPrefix + '. This will be ready after restart.'},
  function callback(err){
    config.prefix = newPrefix;
    console.log('Prefix changed to ' + newPrefix + '. Applying change to JSON file now.');
    fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
      console.log('File write completed Successfully. New prefix: ' + newPrefix + ' now applied.');
      respond('New prefix: ' + newPrefix + ' now applied. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
    });
  })
  }


//grabs arguments for input command.
  function getArg(cmd, msg, channelID){
    var args = msg.substring(cmd.length + 1, msg.length);
    if (args.length > 0){//arguments exist;
      return args;
    } else {// no arguments, return usage.
      bot.sendMessage({
        to: channelID,
        message: help.usage[cmd]
      })
    }
  }


//function to check if command is contained within input string / message.
  function cmdIs(cmdName, message){
    if (message.substring(0 + prefix.length, cmdName.length + 1) === cmdName) {

      return true

    } else {return false};
  }


//generates help command info:


function generateHelp(){

  var fullHelp = '```';
  for (var i = 0; i < help.commands.length; i++){
    var commandName = help.commands[i];
    var commandNameFull = prefix + help.commands[i];
    var info = help[commandName].desc;
    var usage = 'Usage: ' + help[commandName].usage;

    var outputString = commandNameFull + ' - ' + info + '\n';
    if (i === help.commands.length - 1){
    fullHelp += outputString + '```';
  } else {
    fullHelp += outputString;
  }

  }

  return fullHelp;

}
