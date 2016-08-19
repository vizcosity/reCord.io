var Discord = require('discord.io');
var http = require('http');
var b64encode = require('base64-stream').Encode;

var fs = require('fs');

var config = require('./config.json');
var help = require('./help.json');
var alias = require('./alias.json');
var soundlog = require('./soundlog.json');

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

//prefix & alias check:
if (message.substring(0,1) === prefix){//message contains cmd prefix, proceed to cmd methods;
  //aliascheck
  var aliasCheck = message.substring(prefix.length, message.length);
  console.log(aliasCheck);
  //check for alias and apply msg swap.
  if (typeof alias[aliasCheck] !== 'undefined'){
    console.log(alias[aliasCheck]);
    channelMsg = prefix + alias[aliasCheck];
    console.log(channelMsg);
  } else {//no alias
    var channelMsg = message;
  }

//main command list methods;

      //setAlias method:
      newCommand('shortcut', message, function setAlias(arg){

          var shortcutName = arg.split(' ')[0];
          var aliasCmdName = arg.split(' ')[1];
          console.log(arg);

          if (typeof help[shortcutName] == 'undefined'){//command does not already exist.
            console.log(shortcutName);
            //console.log(aliasCmdName);
            console.log(arg.substring(shortcutName.length + 1, arg.length));

            alias[shortcutName] = arg.substring(shortcutName.length + 1, arg.length);

            fs.writeFile('./alias.json', JSON.stringify(alias, null, 2), function callback(err){
              if (err !== null){console.log(err)};
              console.log('File write completed Successfully. New Alias: ' + shortcutName + " added which runs: " + alias.shortcutName);
              respond('New Alias: ' + shortcutName + ' now added. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
            });
          } else {
            respond('Command: ' + prefix + shortcutName + ' already exists. Please choose another shortcut name.', channelID);
          }



      }, 'yes');
      //end shortcut method.

      //purge method:
      newCommand('purge', message, function doPurge(arg){
        purgeCmd(channelMsg, channelID, user, userID);
      }, 'yes');
      //end purge execute command.

      //help method
      if(cmdIs('help', channelMsg)){
        var cmd = help;
        if ( hasArgs('help', channelMsg) === false ) {
          //no arguments so generate normal help and send to DM for user;
          bot.sendMessage({
            to: userID,
            message: generateHelp()
          })
        } else {//command has arguments
        //  console.log(getArg(prefix + 'help', message))
          var helpItem = help[getArg(prefix + 'help', channelMsg, channelID)];
          var outputHelpCmdText = "```" + "Description: " + helpItem.desc + '\n \n' + "Usage: " + prefix + helpItem.usage + "```";
            respond(outputHelpCmdText, channelID);
        }

      }
      //end help

      //set global cmd prefix;
      if (message.substring(0,10) === prefix + 'setprefix'){
        setprefixCmd(user, userID, channelID, message);
      }
      //end set global cmd prefix

      //change status
      if (cmdIs('status', message)){
        var newStatus = getArg(prefix + 'status', message);
        bot.setPresence({
          game: newStatus
        });

        console.log('Status changed to: ' + newStatus);
      }
      //end change status

      //get msg (DEBUG)
      if (cmdIs('getmsg', message)){
        bot.getMessages({
          channelID: channelID,
          limit: 1
        }, function callback(err, array){
          console.log(array);
        })
      }
      //end get msg (Debug)

      //anonmsg
      if (cmdIs('anonmsg', message)){
        if (hasArgs('anonmsg', message)){
          var messageToSendArray = message.split(' ');
          var messageToSend = '';

          for (var i = 2; i < messageToSendArray.length; i++){
            if (i < messageToSendArray.length - 1){ messageToSend += messageToSendArray[i] + ' ';} else {
              messageToSend += messageToSendArray[i]; //dont add a space after last array item
            }
          }
          //grab id for user to send to, and send message on callback
            bot.getMessages({
              channelID: channelID,
              limit: 1
              }, function callback(err, array){
                if (err !== null){ console.log(err)};
                var userToSendMsgTo = array[0].mentions[0].id;

                bot.sendMessage({
                  to: userToSendMsgTo,
                  message: messageToSend
                }, function callback(err){//logging for sneaky means
                  bot.deleteMessage({
                    channelID: channelID,
                    messageID: array[0].id
                  });
                  if (err !== null){console.log(err)};
                   console.log(array[0].author.username + ' send a secret message to ' + array[0].mentions[0].username + ' with msg: ' + messageToSend)
                })
            })

        } else {
          respond(help.anonmsg.usage, channelID);
        }
      }
      //end anonmsg

      //(TEMPORARY) set voice channel ID;
      newCommand('setVoiceID', channelMsg, function newVoiceChannelID(Arg){
        voiceChannelID = Arg;
      }, 'yes');
      //end set voice channel ID;

      //play RAW audio file (MP3 or PCM etc.);
      newCommand('audio', channelMsg, function audioPlay(arg){
        audio(arg);
      }, 'yes');
      //end audio command.

      //play web streaming link (not raw MP3) command:
      newCommand('play', channelMsg, function playWeb(link){
        //check to see if site is supported;
        var baseUrl = link.split('/')[1];
        var supportedSites = {
          "www.youtube.com": "yes"
        };

        if (typeof supportedSites[baseUrl] === 'undefined'){//site not supported.
          respond('Sorry! This site is currently not supported. Pester Aaron if you care about it.', channelID);
        } else {//site is supported, continue with method.
          
        }//end supported site check
      })
      //end web streaming command function.

      //randomsound command;
      newCommand('randomsound', channelMsg, function playRandomSound(){
        audio(soundlog['audio'][randomIntFromInterval(0, soundlog['audio'].length - 1)]);
      });
      //end randomsound method

      //leaveVoiceChannel
      newCommand('leave-voice', channelMsg, function(){
        var voiceChannelID = '128319522443624448';
        bot.leaveVoiceChannel(voiceChannelID);
      });
      //end leave voice method

      //basic responses;
        switch (channelMsg) {
          case prefix + 'ping':
            respond('pong',channelID);
            break;

          case prefix + 'channelid':
            respond('ChannelID: ' + channelID, channelID)
            break;

          default:
      }//end basic responses

      //restart bot method / command;
      if (channelMsg.substring(0, message.length) === prefix + 'restart'){
          bot.sendMessage({
            to: channelID,
            message: 'Bot restarting now.'
          }, function callback(err){
            if (err !== null){console.log(err)};
              console.log('/restartChild');
          });
      }
      //end restart bot method

      //set username method;
      if (cmdIs('setusername', channelMsg) && getArg(prefix + 'setusername', channelMsg, channelID).length > 0){
        var newUsername = getArg(prefix + 'setusername', channelMsg);
        config.name = newUsername;
        console.log('Bot Username changing to: ' + newUsername + '.')
        fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
          if (err !== null){console.log(err)};
          console.log('File write completed Successfully. New username: ' + newUsername + ' now applied.');
          respond('New username: ' + newUsername + ' now applied. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
        });
      }
      //end set username method;

      //debug console method;
      newCommand('dc', channelMsg, function dc(arg){
        eval(arg);
      }, 'yes');
      //end debug method


      //get info
      newCommand('getserverinf', channelMsg, function callback(cmdArg){
        console.log(bot)
      }, 'yes');
      //end get info method

      //quote method;
      if (cmdIs('quote', channelMsg, channelID)){

        if (channelMsg !== prefix + 'quote'){
        var msgArray = [];
        var username;

          bot.getMessages({
            channelID: channelID,
            limit: 50
          }, function callback(error, array){
            if (error !== null){console.log(error)};
            userQuoteID = array[0].mentions[0].id;
            for (var i = 0; i < array.length; i++){
              if (array[i].author.id === userQuoteID && array[i].content.substring(0,1) !== prefix){
                msgArray.push(array[i].content);
              };
            };

            if (msgArray.length > 0){
              var randomNumber = randomIntFromInterval(0, msgArray.length - 1);
              var randomQuote = msgArray[randomNumber];

              bot.sendMessage({
                to: channelID,
                message: "_'" + randomQuote + "'_"
              })

            } else {
              respond('No quotes found. \n _I cannot retrieve a random user quote if it is more than 50 messages away._', channelID);
            }

          });
        } else {//end check for args conditional
          respond('Please mention a user to quote from.', channelID)
        }

      }
      //end quote method;


    }//end conditional for checking command prefix, other messages ignored.


//functions that require on message scope:

//joins voice channel and plays audio file;
function audio(arg){

      var serverID = bot.channels[channelID].guild_id;
    //  var voiceChannelID = bot.servers[serverID].members[userID]
      var voiceChannelID = '128319522443624448'; //temp default for now.
      //get msg

      bot.joinVoiceChannel(voiceChannelID, function callback(){
        bot.getAudioContext({channel: voiceChannelID, stereo: true}, function callback(err, stream){//send audio
            console.log(arg);
            stream.playAudioFile(arg);
            stream.once('fileEnd', function(){
              bot.leaveVoiceChannel(voiceChannelID);
              soundlog['audio'].push(arg);
              fs.writeFile('./soundlog.json', JSON.stringify(soundlog, null, 2), function callback(err){
                if (err !== null){console.log(err)};
              });//end update soundlog file.
            })
          });//end get audio context
      })//end join voice method
}
//end play audio command method logic.

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
//end respond logic

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

                if (purgeArg <= 100 && purgeArg >= 2){
                    amtToDelete = purgeArg;
                } else {
                  amtToDelete = 'Invalid';
                }

        } else {
          amtToDelete = 'Not Number'
        }
        //proceed to purge method;

          if (amtToDelete !== 'Not Number' || amtToDelete !== 'Invalid'){

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
            if (amtToDelete === 'Not Number'){
              respond('```Please ensure that you have entered a number for the amount of messages to purge.```', channelID);
            } else if (amtToDelete === 'Invalid'){
              respond('```Please enter a number between 2 and 100. Entries greater than 100 are not supported by the Discord BOT Api (Too resource intensive). emplan sorry guys.```', channelID);
            }
          };

      }
//finish purge method

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
//end set prefix method;


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
//end get command arguments function


//function to check if command is contained within input string / message.
  function cmdIs(cmdName, message){
    if (message.substring(0 + prefix.length, cmdName.length + 1) === cmdName) {

      return true

    } else {return false};
  }
//end check if command function;


//generates help command info;
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
//end generate help function;

//find random number;
function randomIntFromInterval(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
//end random number function

//checks if command has arguments;
function hasArgs(cmd, message, type){
    //assumes that correct command is input;
    var calc1 = prefix + cmd + ' ';
  if (message.substring(0, prefix.length + cmd.length + 1) === calc1 && message.length > calc1.length){
    //command has arguments
    if (type === undefined){
      return true;
    } else {
      if (typeof getArg(cmd, message) === type){ return true} else {console.log(cmd + ' has args ' + getArg(cmd, message) + ' but not correct type'); return false};
    }
  } else {
    console.log(cmd + ' has no arguments. Returning false');
    return false
  }

}
//end check to see if cmd has arguments function

//function to automate adding new commands
function newCommand(commandName, message, func, arg){
    if (cmdIs(commandName, message)){//checks to see if cmd contained within received message.
      //proceed with command method;
      if (arg === 'yes'){// requires arguments;
        if (hasArgs(commandName, message)){//command has arguments, proceed to method;
          var commandArgs = getArg(prefix + commandName, message);
                      func(commandArgs);
        }  else {//no arguments, return usage if no arguments required.
          respond('Usage: ' + prefix + help.commandName.usage, channelID)
        }
      } else {//command doesn't require arguments
        func();
      }
    }
}
//end new command function;

//print whole object
function printObject(o) {
  var out = '';
  for (var p in o) {
    out += p + ': ' + o[p] + '\n';
  }
  return(out);
}
