var Discord = require('discord.io');
var http = require('http');
var b64encode = require('base64-stream').Encode;

var fs = require('fs');
var ytStream = require('youtube-audio-stream');
var ytdl = require('ytdl-core');
var YouTube = require('youtube-node');
var youTube = new YouTube();

youTube.setKey('AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU');

var config = require('./config.json');
//var toWav = require('audiobuffer-to-wav')
var help = require('./help.json');
var alias = require('./alias.json');
var soundlog = require('./soundlog.json');
var Lame = require('lame');
var spawn = require('child_process').spawn;
var player = require('./Player.js');
var Player = '';
var osmosis = require('osmosis');
var editLooper;

var CLIArguments = process.argv[2];
var token = "MjA1MzkxMTI2MjkzNzc0MzM2.CpJbog.TH8o86o4pIoHghC6_U2H3xQwJKg";

if (CLIArguments === 'dev'){
  console.log('Starting Developer mode.')
  token = "MjE4NzcyNzg0MDU3Mjg2NjU2.CqIH_w.pnZbF7HqN1-ciwO_5PD8S0Dz6pQ";
};

var prefix = config.prefix;

var bot = new Discord.Client({
  //token: "MjA1MzkxMTI2MjkzNzc0MzM2.CpJbog.TH8o86o4pIoHghC6_U2H3xQwJKg",
  token: token, //development mode
  autorun: true
});

var voiceChannelID = '128319522443624448'; //temp default for now.
var currentStatus = config.status;

var randomSoundboard = config.randomSoundboard;
var randomSoundDelay = parseInt(config.randomSoundDelay);
var holdConversation = false;
var desiredResponseChannel;
var audioFilePlaying = false;
var sitcom = false;
var attitude = config.attitude;
var delay = 0, activeDelay = delay, cmdToCooldown = '', cooldown = false, cooldownResponse, delayCountdown;

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

  };

  bot.sendMessage({
    to: config.serverSpecific['128319520497598464'].logChannel,
    message: config.name + ' Successfully loaded.'
  });

  bot.setPresence({
    game: {
      name: 'Loaded!'
    }
  });

  setTimeout(setCurrentStatus, 5000);

  function setCurrentStatus(){

    bot.setPresence({
      game: {
        name: currentStatus
      }
    });

  };

  if (randomSoundboard === 'true'){
      console.log('Random sounds is running.');
      callFunctionEvery(playRandomSoundFromSoundboard, randomSoundDelay);
  }

  //play audio requires scope of on ready
  function audioRANDOM(arg){
        var extraArguments = arg.split(' ')[1];
        var serverID = bot.channels['151051305295675395'].guild_id;
      //  var voiceChannelID = bot.servers[serverID].members[userID]
        //get msg
        bot.joinVoiceChannel(voiceChannelID, function callback(){
          bot.getAudioContext({channel: voiceChannelID, stereo: true}, function callback(err, stream){//send audio
              //console.log(arg);
              stream.playAudioFile(arg);
              bot.setPresence({game: {name: arg}});//setting playing to audiofilename
              stream.once('fileEnd', function(){
                bot.setPresence({//reverting status
                  game: {
                    name: 'Surprise dank'
                  }
                })

                bot.leaveVoiceChannel(voiceChannelID); //leave voice channel?

                soundlog['audio'].push(arg);
                fs.writeFile('./soundlog.json', JSON.stringify(soundlog, null, 2), function callback(err){
                  if (err !== null){log(err)};
                });//end update soundlog file.
              })
            });//end get audio context
        })//end join voice method

  }
  //end play audio command method logic.

  //play random soundboard
  function playRandomSoundFromSoundboard(){
    if (randomIntFromInterval(0,1) === 1){
      if (Player == ''){
        audioRANDOM('./audio/' + soundlog.soundboard[randomIntFromInterval(0,soundlog.soundboard.length)]);
        console.log('Randomly played ' + soundlog.audio[soundlog.audio.length]);
      }
    }
  }
  //end random soundboard play

  //repeat function
  function callFunctionEvery(func, delay) {
    setInterval(func, delay);
  }
  //end repeat
});

var conversationHandlerLogic;

bot.on('message', function(user, userID, channelID, message, event){

  /*try {//attempt to set voice channel
    voiceChannelID = bot.servers[serverID].members[userID].voice_channel_id;
  } catch (e) {
    log('Could not set voice channel of user. Using default channel: ' + e);
  };*/

  if (userID !== bot.id){

  //try setting serverID
  try {
    var serverID = bot.channels[channelID].guild_id;
  } catch(e) {
    error(e);
  };
  //set serverID of message.

  //message filtering
  filter(message.toLowerCase(), event);
  //end message filtering

  //pass messages to convo handler
  messageHandler(channelID, message);
  //end convo handler

  //cooldown handler
  cooldownHandler(message, user);
  //end cooldown handler

  //check if wildbot is being used
  if (message.substring(0,2) === '++' && message !== '++leave-voice' && message.substring(0,'++rule34'.length) !== '++rule34' && attitude === true){
      if (message === '++'){
        bot.sendMessage({
          to: channelID,
          message: 'nice try ' + user + ' im not gonna get pissed off that easily, but fuck u still',
          typing: true
        });
      } else {
      respond("Dude...", channelID);
      setTimeout(function(){
        bot.sendMessage({
          to: channelID,
          message: "seriously?",
          typing: true
        }, function(){
        bot.sendMessage({
          to: channelID,
          message: "I'm like, right here",
          typing: true
        }, function(){
          bot.sendMessage({
            to: channelID,
            message: "ouch",
            typing: "true"
          }, function(){
            bot.sendMessage({
              to: channelID,
              message: 'wtf did i ever do to u ' + user,
              typing: true
            }, function(){
              if (message === '++voice'){
                bot.sendMessage({
                  to:channelID,
                  message: 'FUCK YOU WILDBOT',
                  typing: true
                }, function(){
                  bot.sendMessage({
                    to: channelID,
                    message: '++leave-voice',
                    typing: true
                  }, function(){
                    bot.sendMessage({
                      to: channelID,
                      message: "there, that's better. try !queue next time fam. ;)",
                      typing: true
                    });
                  })
                })
              }
            });
          });
        });
      });
    }, 1000);}


    } else if (message.substring(0, '++rule34'.length) === '++rule34'){
    try  {
      var disgustResponses = [
        'wtf dude u nasty',
        'ewwww',
        'i hope you feel ashamed fam',
        'i actually feel bad for wildbot, poor piece of shit has to deal with your horny fucks',
        'u guys need help',
        'seriously?',
        mention(userID) + ' im actually ashamed of you',
        'so much disappoint rn'
      ];

      var chooseRandomResponse = disgustResponses[randomIntFromInterval(0,disgustResponses.length)];
      bot.sendMessage({
        to: channelID,
        message: chooseRandomResponse,
        typing: true
      }, function(){
        log('Responded to ' + user + ' with ' + chooseRandomResponse)
      })
    } catch(e) {
      error(e);
    };
  };
  //end cheeky check for other bot.

  //prefix & alias check:
  if (message.substring(0,1) === prefix){//message contains cmd prefix, proceed to cmd methods;
    //aliascheck
    var aliasCheck = message.substring(prefix.length, message.length);
    //check for alias and apply msg swap.
    if (typeof alias[aliasCheck] !== 'undefined'){
      channelMsg = prefix + alias[aliasCheck];
    } else {//no alias
      var channelMsg = message;
    }
  //end prefix & alias check;

  //log command and user:
  log(user + " tried to execute: " + message);
  //end log command.

  //main command list methods;

      //setAlias method:
      newCommand('shortcut', message, function setAlias(arg){
        try {
          var shortcutName = arg.split(' ')[0];
          var aliasCmdName = arg.split(' ')[1];
          log(arg);

          if (typeof help[shortcutName] == 'undefined'){//command does not already exist.
            //log(shortcutName);
            //console.log(aliasCmdName);
            //log(arg.substring(shortcutName.length + 1, arg.length));

            alias[shortcutName] = arg.substring(shortcutName.length + 1, arg.length);

            fs.writeFile('./alias.json', JSON.stringify(alias, null, 2), function callback(err){
              if (err !== null){console.log(err)};
              log('File write completed Successfully. New Alias: ' + shortcutName + " added which runs: " + alias.shortcutName);
              respond('New Alias: ' + shortcutName + ' now added. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
            });
          } else {
            respond('Command: ' + prefix + shortcutName + ' already exists. Please choose another shortcut name.', channelID);
          }

        } catch (e){
          log(e);
          reply('Sorry! I encountered an error: ' + e);
        }

      }, 'yes');
      //end shortcut method.

      //set attitude
      newCommand('attitude', channelMsg, function(){
        if (attitude === false){
          notify('**Attitude enabled**. Wildbot can suck it.');
          attitude = true;
          fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
            if (err !== null){log(err)};
            log(user + ': ' + userID + ' toggled attitude to: "' + attitude + '"');
          });
          } else {
          //attitude is already true, turn to false;
          attitude = false;
  		  notify('**Attitude disabled**. I will no longer pester you about wildbot.');
            log(user + ': ' + userID + ' toggled attitude to: "' + attitude + '"');
          }

      });
      //end set attitude

      //purge method:
      newCommand('purge', channelMsg, function doPurge(arg){
        try {
          if (channelID === config.serverSpecific[serverID].logChannel){reply('Nice try ' + mention(userID) + ';)')} else {
            purgeCmd(channelMsg, channelID, user, userID);
          }

        } catch (e) {
          error(e);
        }
      }, 'yes');
      //end purge execute command.

      //help method
      if(cmdIs('help', channelMsg)){
        try {
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
        } catch(e) {
          error(e);
        }
      }
      //end help

      //set global cmd prefix;
      if (message.substring(0,10) === prefix + 'setprefix'){
        try {
          setprefixCmd(user, userID, channelID, message);
        } catch (e) {
          error(e);
        };
      }
      //end set global cmd prefix

      //change status
      if (cmdIs('status', message)){
        try {
          var newStatus = getArg(prefix + 'status', message);
          currentStatus = newStatus;
          bot.setPresence({
            game: {
              name: newStatus
            }
          });

          log('Status changed to: ' + newStatus);
        } catch (e) { error(e) };
      }
      //end change status

      //get msg (DEBUG)
      if (cmdIs('getmsg', message)){
        try  {
          bot.getMessages({
            channelID: channelID,
            limit: 1
          }, function callback(err, array){
            log(array);
          })
        } catch (e) { error(e) };
      }
      //end get msg (Debug)

      //anonmsg
      if (cmdIs('anonmsg', message)){
        try {
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
                  if (err !== null){ log(err)};
                  var userToSendMsgTo = array[0].mentions[0].id;

                  bot.sendMessage({
                    to: userToSendMsgTo,
                    message: messageToSend
                  }, function callback(err){//logging for sneaky means
                    bot.deleteMessage({
                      channelID: channelID,
                      messageID: array[0].id
                    });
                    if (err !== null){log(err)};
                     log(array[0].author.username + ' sent a secret message to ' + array[0].mentions[0].username + ' with msg: ' + messageToSend)
                  })
              })

          } else {
            respond(help.anonmsg.usage, channelID);
          }
        } catch (e) { error(e); };
      }
      //end anonmsg

      //play RAW audio file (MP3 or PCM etc.);
      newCommand('audio', channelMsg, function audioPlay(arg){
        try  {
          if (isPlayerLoaded() === false){
          audio(arg);} else {
            respond('Curently playing from playlist. Cannot play sound yet because it will override music and reset playlist. Please wait till playlist finishes and leave voice.', channelID);
          }
        } catch (e) { error(e); };

      }, 'yes');
      //end audio command.

      //play web streaming link (not raw MP3) command:
      newCommand('playsong', channelMsg, function playWeb(link){
        //check to see if site is supported;
        /*var baseUrl = link.split('/')[2];
        var extraArgs = link.split(' ')[1];
        var supportedSites = {
          "www.youtube.com": "yes"
        };
        var requestURL = link.split(' ')[0];
        var videoID = link.split('=')[1];
        Player = new player(bot, 'AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU', '2de63110145fafa73408e5d32d8bb195', voiceChannelID);
        Player.setAnnouncementChannel(channelID);
        Player.enqueue(user, userID, link); */

        reply('Use ' + prefix + 'queue instead.');


      }, 'yes');
      //end web streaming command function.

      //view playlist
      newCommand('playlist', channelMsg, function(arg){
        if (isPlayerLoaded()){
          var firstArg = arg.split(' ')[0];
          if (firstArg === 'info'){
            Player.printPlaylist();
          } else if (firstArg === 'remove') {
            var secondArg = arg.split(' ')[1];
            secondArg = parseInt(secondArg);

            Player.deleteSong(user, userID, secondArg);
          }
        } else {//player not loaded
          respond('No playlist currently set up.', channelID);
        }
      }, 'yes');
      //end view playlist

      //skip function
      newCommand('skip', channelMsg, function(){
        if (isPlayerLoaded()){
          Player.skip(userID);
        } else {//player not loaded.
          respond('No song / playlist currently playing.', channelID);
        }
      });
      //end skip function

      //test cmd setplaylist interruption
      newCommand('setpi', channelMsg, function(arg){
        Player.setPlaylistInterruption(arg);
      }, 'yes');
      //end setplaylist interruption command test

      //addmods player
      newCommand('addmods', channelMsg, function(arg){
        try {
          if(isPlayerLoaded()){
            Player.addMods(arg);
          } else {
            respond('No song / playlist currently playing.', channelID);
          }
        } catch (e) { error(e); };
      },'yes');
      //end addmods

      //removemods
      newCommand('removemods', channelMsg, function(arg){
        try   {
          if (isPlayerLoaded()){
            Player.removeMods(arg);
          } else {
            respond('No song / playlist currently playing.', channelID);
          }
        } catch(e){ error(e); };
      }, 'yes');
      //end remove mods

      //request song
      newCommand('request', channelMsg, function(link){
        try   {
          /*
          voiceChannelID = bot.servers[serverID].members[userID].voice_channel_id;
          if (isPlayerLoaded() === false){Player = new player(bot, 'AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU', '2de63110145fafa73408e5d32d8bb195', voiceChannelID);} //bot not on yet, initiate and then queue.
            var requestURL = link.split(' ')[0];
            //console.log(requestURL.split('/')[0]);
            if (requestURL.split('/')[0] === 'http:' || requestURL.split('/')[0] === 'https:'){
            Player.setAnnouncementChannel(channelID);
            Player.enqueue(user, userID, requestURL);
          } else {//no link, search instead
            var query = link;
            log("Attempting to queue: " + query);
            youTube.search(query, 2, function(error, results){
              var videoSearchQueryID = results.items[0].id.videoId;
              var requestURLFromQuery = 'https://www.youtube.com/watch?v=' + videoSearchQueryID;
              Player.setAnnouncementChannel(channelID);
              Player.enqueue(user, userID, requestURLFromQuery);
            });//end yt search query.
          } */
          if (userID === '165570868355792897'){
            reply(mention('165570868355792897') + ' david pls can u not thx')
          }
          reply(prefix + 'request has been disabled (for now) while ' + mention('128319285872427008') + ' works on an ' + prefix + 'instaqueue command.\n Use ' + prefix + 'queue fam.');

        }  catch (e) { error(e); };
      }, 'yes');
      //end request command function

      //request song
      newCommand('queue', channelMsg, function(link){
        try {
          var initialmsgID = event.d.id;
          if (audioFilePlaying){error('Local audio file currently playing. Please ' + prefix + 'lv (' + prefix + 'leave-voice) and try queuing again.')} else {
            voiceChannelID = bot.servers[serverID].members[userID].voice_channel_id;
            if (isPlayerLoaded() === false){Player = new player(bot, 'AIzaSyA9ZnSNiPtAI96wRNi6r_VEPADdu13JHbo', '2de63110145fafa73408e5d32d8bb195', voiceChannelID);} //bot not on yet, initiate and then queue.
              var requestURL = link.split(' ')[0];
              //console.log(requestURL.split('/')[0]);
              if (requestURL.split('/')[0] === 'http:' || requestURL.split('/')[0] === 'https:'){
              Player.setAnnouncementChannel(channelID);
              Player.enqueue(user, userID, requestURL);
            } else {//no link, search instead
              var query = link;
              log('Attempting to queue: ' + query);
              var respondChannel = channelID;
              setCooldown('queue', 10000);

              function ytSearchPlayerInterface(query, amtOfResults){
                var fallbackQuery = query;
                youTube.search(query, amtOfResults, function(error, results){
                  if (error !== null){respond('YT Search responded with error ' + error, respondChannel)};
                  var allowedResults = [];
                  var videoSearchQueryID;
                  try {
                    if (results.items.length > 0){//results obtained Successfully;
                      for (var i = 0; i < amtOfResults; i++){
                        if (results.items[i].id.kind === 'youtube#video'){
                          allowedResults.push({title: results.items[i].snippet.title, id:results.items[i].id.videoId});
                        }
                      };
                    } else { respond("Search results could not be obtained.", respondChannel); };
                  } catch(e){ err(e); };

                  if (allowedResults.length > 0){ // results obtained.
                  var stringedResults = "Below are the results. Which result would you like to queue? (Respond with number of item you would like).\n\nChoosing the first option if you don't respond in 8 seconds: \n";

                  for (var i = 0; i < allowedResults.length; i++){
                    if (i !== allowedResults.length - 1){
                      stringedResults += '**' + i + '.** ' + allowedResults[i].title + '\n';
                    } else {//finish output
                      stringedResults += '**' + i + '.** ' + allowedResults[i].title + "\n\n **More** | **None / Cancel**";
                    };
                  };
                  var requestUser = userID;
                  var searchQueryMsgID;
                  bot.sendMessage({
                    to: respondChannel,
                    message: stringedResults
                  }, function(err, response){
                    try {
                      searchQueryMsgID = response.id;
                    } catch(e){err(e);};
                    log(searchQueryMsgID);
                  });
                  setTimeout(hasUserRespondedToYTSearchQuery, 8000);//wait 4 seconds for user response.
                  var deleteMsgsAfterAWhileID = [];
                  bot.on('message', function(userR, userIDR, channelIDR, messageR, eventR){
                    deleteMsgsAfterAWhileID.push(event.d.id);
                    if (userIDR === requestUser){

                    if (typeof videoSearchQueryID === 'undefined'){
                      if (messageR.toLowerCase() === 'none' || messageR.toLowerCase() === 'cancel') {//extra options.
                        respond('Cancelled search query.', respondChannel);
                        videoSearchQueryID = 'null';
                        return;
                      }
                      if (messageR.toLowerCase() === 'more'){
                        videoSearchQueryID = 'null';
                        ytSearchPlayerInterface(query, amtOfResults + 5);
                        return;
                      }
                      var index = parseInt(messageR);
                      if (typeof allowedResults[index] !== 'undefined'){//check if number entered.
                        videoSearchQueryID = allowedResults[index].id;
                        bot.deleteMessage({
                          channelID: respondChannel,
                          messageID: searchQueryMsgID
                        });
                        //respond('Queueing ' + allowedResults[index].title, respondChannel);
                        bot.sendMessage({
                          to: respondChannel,
                          message: '**Queueing** ' + allowedResults[index].title
                        }, function (error, response){
                          if (error !== null){log(error)};
                          if (response !== 'undefined'){
                            deleteMsgsAfterAWhileID.push(response.id);
                            console.log(deleteMsgsAfterAWhileID);
                            setTimeout(function(){
                              bot.deleteMessages({
                                channelID: respondChannel,
                                messageIDs: deleteMsgsAfterAWhileID
                              });
                            }, 3000);
                          }
                        });
                        var requestURLFromQuery = 'https://www.youtube.com/watch?v=' + videoSearchQueryID;
                        Player.setAnnouncementChannel(respondChannel);
                        Player.enqueue(user, userID, requestURLFromQuery);
                        return;
                      }//if id of user msg response is valid check end.
                  } else {//request done, return nothing.
                    return;
                  }}//check if should listen to original requester user.

                  });//end on message event listener user response for search query.


                  function hasUserRespondedToYTSearchQuery(){
                    if (typeof videoSearchQueryID === 'undefined'){//no input from user.
                      bot.deleteMessage({
                        channelID: respondChannel,
                        messageID: searchQueryMsgID
                      });
                      respond('Queueing first result, ' + allowedResults[0].title, respondChannel);
                      videoSearchQueryID = allowedResults[0].id;
                      var requestURLFromQuery = 'https://www.youtube.com/watch?v=' + videoSearchQueryID;
                      Player.setAnnouncementChannel(respondChannel);
                      Player.enqueue(user, userID, requestURLFromQuery);
                    }
                  }//end define check user response method and queue song.

                } else {// no results obtained.
                  respond("No results found. Either search query was invalid or it turned up no video results.", respondChannel);
                }

                });//end yt search query.

              };

              ytSearchPlayerInterface(query, 5);
            }
          };
        } catch (e) { error(e); };

      }, 'yes');
      //end queue command function

      //setplaylist command
      newCommand('setplaylist', channelMsg, function(arg){
        try {
          if (isPlayerLoaded()){
            Player.setDefaultPlaylist(arg);
          } else {
            reply("Can't set playlist until bot joins voice. Queue a random song and try again or use " + prefix + "joinvoice");
          }
        } catch(e) { error(e); };
      }, 'yes');
      //end setplaylist

      //filtering
      newCommand('filter', channelMsg, function(arg){
        try {
          var firstArg = arg.split(' ')[0];
          if (firstArg === 'list'){
            //no arguments, return filtered words;
            try {
              var stringedOutput = '**List of filtered words:**\n\n';
              for (var i = 0; i < config.filter.length; i++){
                if (i !== config.filter.length){
                  stringedOutput += '"' + config.filter[i] + '"\n';
                } else {
                  stringedOutput += '"' + config.filter[i] + '"';
                }
              }
            } catch(e) { error(e); };

            try {
              reply(stringedOutput);
            } catch(e){ error(e); };

          }

          if (firstArg === 'add'){
            var filterToAdd = arg.substring('add'.length + 1, arg.length).toLowerCase();
            if (filterToAdd !== '' && filterToAdd !== '  ' && filterToAdd !== '   ' && filterToAdd !== '     '){
              if (filterToAdd.length <= 3 && userID !== '128319285872427008'){
                error('Only ' + mention('128319285872427008') + ' can add filters that are 3 characters long or less for now.\n\n (Will add support for admin roles to be able to do this soon.)');
              } else {
                if (filterExists(filterToAdd) !== false){//filter already exists
                  error('Filter: ' + filterToAdd + ' already exists.');
                } else {
                  config.filter.push(filterToAdd);
                  fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
                    if (err !== null){log(err)};
                    log(user + ': ' + userID + ' added filter: "' + filterToAdd + '"');
                    respond('Filter: *"' + filterToAdd + '"* successfully added.', channelID);
                  });
                }
              }//end check for small filters
            } else {
              error('Cannot filter spaces alone.');
            }
          }//check for first argument

          if (firstArg === 'remove'){
            var filterToRemove = arg.substring('remove'.length + 1, arg.length);
            var filterIndex = filterExists(filterToRemove); //will be false if doesn't exist; returns index if does.
            if (filterExists(filterToRemove) === false){  error('Filter: ' + filterToRemove + ' does not exist.'); } else {//filter exists, proceed to removal
              config.filter.splice(filterIndex, 1); //removes filter from array;
              fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
                if (err !== null){log(err)};
                log(user + ': ' + userID + ' removed filter: "' + filterToRemove + '"');
                respond('Filter: *"' + filterToRemove + '"* successfully removed.', channelID);
              });
            }
          }
        } catch(e) { error(e); };

        function filterExists(filter){
          var output = false;
          for (var i = 0; i < config.filter.length; i++){
            if (config.filter[i] === filter){
              output = i;
              break;
            }
          }
          return output;
        }
      }, 'yes');
      //end filtering

      //randomsound command;
      newCommand('randomsound', channelMsg, function playRandomSound(){
        try {
        audio(soundlog['audio'][randomIntFromInterval(0, soundlog['audio'].length - 1)]);
      } catch(e) { error(e); };
      });
      //end randomsound method

      //set annoyance
      newCommand('setsurprise', channelMsg, function(){
        try {
          if (config.randomSoundboard === 'true'){

            config.randomSoundboard = 'false';

            fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
              if (err !== null){log(err)};
              log('Surprise sounds set to ' + config.randomSoundboard);
              respond('Surprise sounds set to ' + config.randomSoundboard + '. I will no longer surprise you with some sounds fam.', channelID);

            });
          } else {//turn on
            config.randomSoundboard = 'true';
            fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
              if (err !== null){log(err)};
              log('Surprise sounds set to ' + config.randomSoundboard);
              respond('Surprise sounds set to ' + config.randomSoundboard + '. The best thing about surprises is regret.', channelID);

            });
          }
        }   catch(e) { error(e); };
      });
      //end annoyance command

      //soundboard
      newCommand('soundboard', channelMsg, function(){
        try {
          audio('./audio/' + soundlog.soundboard[randomIntFromInterval(0,soundlog.soundboard.length)]);
        } catch(e) { error(e); };
      });
      //end soundboard command

      //joinvoice:
      newCommand('joinvoice', channelMsg, function(){
        try {
          Player = new player(bot, 'AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU', '2de63110145fafa73408e5d32d8bb195', voiceChannelID);
        } catch(e) { error(e); };
      });
      //end join voice method

      //leaveVoiceChannel
      newCommand('leavevoice', channelMsg, function(){
        try {
          if (isPlayerLoaded()){Player.kill()};
          if (audioFilePlaying){audioFilePlaying = false;}
          bot.leaveVoiceChannel(voiceChannelID);
          bot.setPresence({
            game: {
              name: currentStatus
            }
          })
          Player = '';
        } catch(e){ error(e); };
      });
      //end leave voice method

      //record from voice channel.
      newCommand('rec', channelMsg, function(name){
        respond('Command disabled. Currenlty in development.', channelID);

        /*  bot.joinVoiceChannel(voiceChannelID, function callback(){
          bot.getAudioContext({channel: voiceChannelID, stereo: true}, function callback(err, stream){//send audio

              stream.on('incoming', function(ssrc){

              });

            }); //end get audio context
          }); //end join voice */

        }, 'yes');//end join voice method
      //stop record method.

      //basic responses;
      switch (channelMsg) {
          case prefix + 'ping':
            respond('pong',channelID);
            break;

          case prefix + 'channelid':
            respond('ChannelID: ' + channelID, channelID)
            break;

          default:
      }
      //end basic responses

      //restart bot method / command;
      if (channelMsg.substring(0, message.length) === prefix + 'restart'){
        try {
          if (isPlayerLoaded()){
            respond("I'm currently playing music. Would you like me to interrupt and force restart?", channelID);
            bot.on('message', function (user, userID, channelID, message, event){

              if (message.toLowerCase() === 'yes' || message.toLowerCase() === 'y'){
                bot.setPresence({game: {name: 'Restarting...'}});
                bot.sendMessage({channelID: channelID, message: "Ok fam. Restarting."}, function (err){
                  if (err !== null){log(err)};
                  log(user + ' requested a hard restart.');
                  console.log('/restartChild');
                });
              } else if (message.toLowerCase() === 'no' || message.toLowerCase() === 'n'){
                respond("Alright. I'll wait till I leave voice then restart. If I don't leave automatically, use " + prefix + "lv or " + prefix + "leavevoice", channelID);
                setInterval(checkIfPlayerLoadedAndRestart, 6000);
                function checkIfPlayerLoadedAndRestart(){
                  if (isPlayerLoaded() === false){
                    respond("Finished playing through voice. Restarting now.", channelID);
                    bot.setPresence({game: {name: 'Restarting...'}});
                    console.log('/restartChild');
                  }
                }
              }//end check to force restart
            });//end on message event.
          } else {

            bot.setPresence({game: {name: 'Restarting...'}});

            console.log('/restartChild');
          }
        } catch(e){ error(e); };
      }
      //end restart bot method

      //set username method;
      if (cmdIs('setusername', channelMsg) && getArg(prefix + 'setusername', channelMsg, channelID).length > 0){
        var newUsername = getArg(prefix + 'setusername', channelMsg);
        config.name = newUsername;
        log('Bot Username changing to: ' + newUsername + '.')
        fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
          if (err !== null){console.log(err)};
          log('File write completed Successfully. New username: ' + newUsername + ' now applied.');
          respond('New username: ' + newUsername + ' now applied. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
        });
      }
      //end set username method;

      //debug console method;
      newCommand('dc', channelMsg, function dc(arg){
        if (userID === '128319285872427008'){//check to see if I am the one using console.
          try {
            eval(arg);
          } catch(e){
            respond(e, channelID);
          }

        } else {
          log('User: ' + user + ': ' + userID + ' tried to use the following in console: ' + arg);
          reply('Sorry! Only ' + mention('128319285872427008') + ' can use direct console.');
        }
      }, 'yes');
      //end debug method

      //get info
      newCommand('getserverinf', channelMsg, function callback(cmdArg){
        log(bot)
      }, 'yes');
      //end get info method

      //quote method;
      if (cmdIs('quote', channelMsg, channelID)){
        try {
          if (channelMsg !== prefix + 'quote'){
          var msgArray = [];
          var username;

            bot.getMessages({
              channelID: channelID,
              limit: 50
            }, function callback(error, array){
              if (error !== null){log(error)};

              try {
                userQuoteID = array[0].mentions[0].id;
              } catch(e){ log(e); };

              try {
                for (var i = 0; i < array.length; i++){
                  if (array[i].author.id === userQuoteID && array[i].content.substring(0,1) !== prefix){
                    msgArray.push(array[i].content);
                  };
                };
              } catch(e) { log(e) };
              if (msgArray.length > 0){
                var randomNumber = randomIntFromInterval(0, msgArray.length - 1);
                if (userQuoteID === '128307686340165632'){var randomQuote = "a lot of people think I'm GAYYY"} else {
                var randomQuote = msgArray[randomNumber];};

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

        } catch(e) { error(e); };
      }
      //end quote method;

      //test BUDI
      newCommand('testbudi', channelMsg, function(){
        var testArray = [];
        var incrementalLoadArray = ["", "────────────", "─", "───────────", "──", "──────────", "───", "─────────", "────", "────────", "─────", "───────", "──────", "──────", "───────", "─────", "────────", "────", "─────────", "───", "─────────", "──", "──────────", "─", "───────────", "", "────────────"];
        var incrementer = 0;
        var currentPlaceMarker = "🔘";
        for (var i = 0; i < 60; i++){
          var incrementFactor = 60 / 12;

            var second;
            if (i.toString().length === 1){
              second = '0' + i.toString();
            } else {
              second = i.toString();
            }
            if (i !== 0 && i % incrementFactor === 0){incrementer += 2};
            //console.log(incrementer);
            testArray.push("▶ " + incrementalLoadArray[incrementer] + currentPlaceMarker + incrementalLoadArray[incrementer + 1] + ' 00:' + second);

        }
        editLooper = new BUDI(channelID);
        editLooper.start(testArray);
      });


      //end test BUDI
      newCommand('budistop', channelMsg, function(){
        editLooper.stop();
      });
      //end testbudi

      //googlefeud
      newCommand('googlefeud', channelMsg, function(){
        var respondChannel = channelID;
        //notify user of startup;
        bot.sendMessage({
            to: channelID,
            message: 'Starting Google Feud. Just a sec.',
            typing: true
            });

        //finish sending notify message to channel.

        var stringedCategoriesResults = 'Pick an option from the following to continue: \n**';
        var catResults = [];
        osmosis
        .get('http://www.googlefeud.com/')
        .find('span.caties')
        .set('categories')
        .data(function(listing){
          catResults.push(listing.categories);
          log(catResults);
          if (catResults.length === 4){
            for (var i = 0; i < catResults.length; i++){
              if (i !== catResults.length - 1){
                stringedCategoriesResults += catResults[i] + '      ';
              } else {
                stringedCategoriesResults += catResults[i] + '**';
              }
            }

            respond(stringedCategoriesResults, channelID);

            var convo = new conversation(channelID);
            convo.start(function(channelID, message){
              switch (message.toLowerCase()) {
                case catResults[0].toLowerCase():
                  respond(catResults[0] + ' category selected.', channelID);
                  continueToGFGame(catResults[0]);
                  convo.stop();
                  break;
                case catResults[1].toLowerCase():
                  respond(catResults[1] + ' category selected.', channelID);
                  categoryResponseFromUser = catResults[1];
                  continueToGFGame(catResults[1]);
                  convo.stop();
                  break;
                case catResults[2].toLowerCase():
                  respond(catResults[2] + ' category selected.', channelID);
                  categoryResponseFromUser = catResults[2];
                  continueToGFGame(catResults[2]);
                  convo.stop();
                  break;
                case catResults[3].toLowerCase():
                  respond(catResults[3] + ' category selected.', channelID);
                  categoryResponseFromUser = catResults[3];
                  continueToGFGame(catResults[3]);
                  convo.stop();
                  break;
                default:
              }
            });
            //handle user response for category
          }//wait till 4 results are collected from site (for categories)

          //proceed to the next stage; after category has been selected.
          function continueToGFGame(category){
            log("Proceeding to main game with " + category + " selected.");
          }

        });//end data listing function.

      });
      //end google feud

      //set sitcom simulator
      var currentlyLaughing = false;
      newCommand('sitcom', channelMsg, function(){
          if (audioFilePlaying === false && isPlayerLoaded() === false){
          try {
            voiceChannelID = bot.servers[serverID].members[userID].voice_channel_id;
            if (sitcom){
              sitcom = false;
              notify('**Sitcom now disabled.**');
              sitcomStop();
            } else {
              sitcom = true;
              notify('**Sitcom started.**');
              sitcomStart();
            };

            function sitcomStart(){
              audioFilePlaying = true;
              if (sitcom){
                bot.joinVoiceChannel(voiceChannelID, function(){
                  bot.getAudioContext({channel: voiceChannelID, stereo: true}, function(error, stream){
                    if (error !== null){ err(error); };

                     bot.on('incomingAudio', function(){
                       console.log('received!');
                       //console.log(ssrc.toString() + stream.toString());
                      //sound incoming, proceed to randomly playback sitcom sounds.
                      var chanceNumber = randomIntFromInterval(0,1);
                      if (chanceNumber === 1 && currentlyLaughing === false){
                        currentlyLaughing = true;
                        stream.playAudioFile(soundlog.sitcom.path + soundlog.sitcom.files[randomIntFromInterval(0, soundlog.sitcom.files.length)]);
                        stream.on('fileEnd', function(){
                          currentlyLaughing = false;
                        });
                      }
                    });
                  });
                });
              }

            };
            //define sitcom start

            function sitcomStop(){
              if (sitcom !== false) sitcom = false;
              bot.leaveVoiceChannel(voiceChannelID);
              audioFilePlaying = false;
            }
            //define sitcom stop

          } catch(e) { err(e); };
        } else {
          if (audioFilePlaying){ err('Local audio is already playing, I cannot interrupt! Cannot start sitcom until bot leaves voice.'); };
          if (isPlayerLoaded()){ err('Currently streaming music from web, cannot interrupt. Try starting sitcom again when bot is not in voice.'); };
        }
      });
      //end sitcom simulator

      //clean chat: Cleans chat from command spam.
      newCommand('clean', channelMsg, function(){
        try {
          bot.getMessages({
            channelID: channelID,
            limit: 100
          }, function(error, response){
            if (error !== null) { log(error); };
            //console.log(response);
            var deleteMsgArray = [];
            for (var i = 0; i < response.length; i++){

              try {
                if (response[i].content.substring(0, prefix.length) === prefix || response[i].author.id === bot.id){
                  try {
                    if (response[i].id === bot.id && response[i].content.substring(0, 'Now playing'.length) === 'Now playing'){/* do nothing */ } else {
                      deleteMsgArray.push(response[i].id);
                    }
                  } catch(e){log(e); };

                }
              } catch(e) { log(e); };



            }//end of loop

            if (deleteMsgArray.length === 0){
              notify('**Error:** I could not find any commands in chat. Must already be clean.');
            } else {//delete msg array.

              bot.deleteMessages({
                channelID: channelID,
                messageIDs: deleteMsgArray
              }, function(){
                //delete finished.
                notify('**Chat successfully cleaned.**');
              });
            }

          });
        } catch(e) { error(e); };

      });
      //end clean chat







    }//end check to see if sender is not bot.
    }//end conditional for checking command prefix, other messages ignored.


  //functions that require on message scope:

  //joins voice channel and plays audio file;
  function audio(arg){
        if (audioFilePlaying || isPlayerLoaded()) {
          if (audioFilePlaying){
            error('Audio already playing!');
          };
          if (isPlayerLoaded()){
            error('Cannot play sound while streaming music. Wait till music finishes and then leave voice.');
          }
        } else {//no audio playing;
          audioFilePlaying = true;
          var extraArguments = arg.split(' ')[1];
          try {
            var serverID = bot.channels[channelID].guild_id;
          } catch(e) { error(e); };
          //  var voiceChannelID = bot.servers[serverID].members[userID]
          //get msg
          bot.joinVoiceChannel(voiceChannelID, function callback(){
            bot.getAudioContext({channel: voiceChannelID, stereo: true}, function callback(err, stream){//send audio
                //console.log(arg);
                stream.playAudioFile(arg);
                bot.setPresence({game: {name: arg}});//setting playing to audiofilename
                stream.once('fileEnd', function(){
                  bot.setPresence({//reverting status
                    game: {
                      name: currentStatus
                    }
                  })

                  bot.leaveVoiceChannel(voiceChannelID); //leave voice channel?
                  audioFilePlaying = false;
                  fs.writeFile['audio'].push(arg);
                  fs.writeFile('./soundlog.json', JSON.stringify(soundlog, null, 2), function callback(err){
                    if (err !== null){log(err)};
                  });//end update soundlog file.
                })
              });//end get audio context
          })//end join voice method
        };
  }
  //end play audio command method logic.

  //function to automate adding new commands
  function newCommand(commandName, message, func, arg){
    try {
      if (cmdIs(commandName, message) && !cooldown){//checks to see if cmd contained within received message & that cooldown is not active.
        //proceed with command method;
        if (arg === 'yes'){// requires arguments;
          if (hasArgs(commandName, message)){//command has arguments, proceed to method;
            var commandArgs = getArg(prefix + commandName, message);
                        func(commandArgs);
          }  else {//no arguments, return usage if no arguments required.
            if (typeof help[commandName] !== 'undefined'){
              respond('```Usage: ' + prefix + help[commandName].usage + '```', channelID)
            }
          }
        } else {//command doesn't require arguments
          func();
        }
      }
    } catch (e){
      log(e);
    }
  }
  //end new command function;

  //quick reply
  function reply(msg){
    respond(msg, channelID);
  };
  //end quick reply.

  //error handler
  function error(error){
    //deals with error msg by logging it to console & responding to user.
    try {
      log('Error: ' + error);
      reply('Error: ' + error);
    } catch (e){
      console.log('Could not handle error: ' + e);
    }

  }
  //end error handler

  //error handler
  function err(error){
    //deals with error msg by logging it to console & responding to user.
    try {
      log('Error: ' + error);
      reply('Error: ' + error);
    } catch (e){
      console.log('Could not handle error: ' + e);
    }

  }
  //end error handler

  //logging:
  function log(Message){
    try {
      if (typeof serverID !== 'undefined'){
        var logChannel = config.serverSpecific[serverID].logChannel;
      } else { serverID = '128319520497598464'};
      respond('`' + Message + '`', logChannel);
      console.log(Message);
    } catch (e) {
      console.log(e);
    }
  }
  //end logging

  //notify:
  function notify(msg, delay) {

    if (typeof delay === 'undefined') delay = 3000; //defaults to 3 seconds of notification before messsage self-destructs.
    bot.sendMessage({
      to: channelID,
      message: msg
    }, function callback(err, response){
      var previousMessageID =  response.id;
      setTimeout(function(){
        bot.deleteMessage({
          channelID: response.channel_id,
          messageID: previousMessageID
        });
      }, delay);
    });

  }
  //notify end declaration

  //cooldown handler
  function cooldownHandler(msg, user){
    if (delay < 5000){
      var clockEmoji = ':clock1:';
    } else if (delay >= 5000 && delay < 10000){
      var clockEmoji = ':clock2:';
    } else if (delay >= 10000 && delay < 15000){
      var clockEmoji = ':clock3:';
    } else if (delay >= 15000 && delay < 20000){
      var clockEmoji = ':clock4:';
    } else {
      clockEmoji = ':clock5:';
    }
    var responseArray = [
      "Yooo **" + user + "** you have a savage but no chill.",
      "**" + user + "** I'm gonna have to ask that you calm down.",
      "**" + user + "** fam, like, chill for a sec.",
      "Oi **" + user + "** can you chill out for a sec? Too quick!"
    ]
    activeDelay = delay;
    var selectedResponse = responseArray[randomIntFromInterval(0,responseArray.length - 1)];

    delayCountdown = setInterval(function(){
      if (cooldown && activeDelay > 0){
        activeDelay -= 1000
        //console.log(activeDelay);
        var outputResponse = selectedResponse + clockEmoji + " **" + activeDelay/1000 + "** seconds left on that cooldown.";

        if (delay > 0 && cmdIs(cmdToCooldown, msg)){
          //delay is set to something above zero & msg contains the cooldown command.
          channelMsg = '';
          //notify(outputResponse);
          cooldownResponse = outputResponse;
          //console.log(cooldownResponse);
          //console.log(activeDelay);
        }
      } else {
        //clearInterval(delayCountdown);
        //cooldown = false;
        activeDelay = 0;
        return;
      }
    }, 2000);

    if (cooldown && cmdIs(cmdToCooldown, msg)){
      coolDownResponder(channelID);
    }

  }
  //end cooldownHandler


});
//end on 'message' event.

//reconnect on disconnect;
bot.on('disconnect', function(errMsg, code){
  bot.connect();
  console.log(config.name + ' disconnected: ' + errMsg + code)
});
//end reconnect


//FUNCTIONS;

//filtering
function filter(msg, eventINF){
    var filteredWords = config.filter;
    if (eventINF.d.author.id !== bot.id && msg.substring(0, prefix.length) !== prefix){//makes sure bot isn't sending the message and that message is not a command.
      for (var i = 0; i < filteredWords.length; i++){
        if (msg.indexOf(filteredWords[i].toLowerCase()) !== -1){
          try {
            bot.deleteMessage({
              channelID: eventINF.d.channel_id,
              messageID: eventINF.d.id
            }); // delete message
            log("`[AUTO-FILTERED] '" + msg + "'. From: " + eventINF.d.author.username + ". Contained: " + filteredWords[i] + '`');
            bot.sendMessage({
              to: eventINF.d.channel_id,
              message: "**[AUTO-FILTERED]** *'" + msg + "'*\n\nContained: " + filteredWords[i]
            }, function callback(err, response){
              //delete notification after 2 seconds;
              setTimeout(function(){
                try {
                  bot.deleteMessage({
                    channelID: response.channel_id,
                    messageID: response.id
                  });
                } catch(e){error(e); };
              }, 2000);
            })
          } catch(e){error(e);};
          break;
        }
      }
    }
};
//end filtering

//logging:
function log(Message){
  try {
    if (typeof serverID !== 'undefined'){
      var logChannel = config.serverSpecific[serverID].logChannel;
    } else { serverID = '128319520497598464'};
    respond(Message, logChannel);
    console.log(Message);
  } catch (e) {
    console.log(e);
  }
}
//end logging

//error handler
function error(error){
  //deals with error msg by logging it to console & responding to user.
  try {
    log('Error: ' + error);
    //reply('Error: ' + error);
    if (typeof serverID !== 'undefined'){
      var logChannel = config.serverSpecific[serverID].logChannel;
    } else {
      serverID = '128319520497598464';
      var logChannel = config.serverSpecific[serverID].logChannel;
    };
    bot.sendMessage({
      to: logChannel,
      message: "Sorry fam but I error'd: " + error
    });
  } catch(e){
    console.log('Could not handle error: ' + e);
  }

}
//end error handler

//conversation handler
function messageHandler(channelID, message){
  try {
    //to run everything that isn't a command;
      if (holdConversation && typeof logicForMessageHandler === 'function'){//run only if it is desired to hold a conversation & logic is not undefined & user isn't bot.
        if (desiredResponseChannel === channelID){//proceed

        log('Message reached message handler.');
        logicForMessageHandler(channelID, message);
        } else {log('Message not part of desired response channel.')};
      }
  } catch(error){
    log('Message Handler Err: ' + error);
  }

}
//end message handler

function conversation(ConvoChannel){
  try {
    desiredResponseChannel = ConvoChannel;
    this.start = function(inputFunc, callback){
      log(inputFunc);
      holdConversation = true;
      logicForMessageHandler = inputFunc; //declares the function to execute the logic.
      if (typeof callback === 'function'){callback()};
    }

    this.stop = function(){
      holdConversation = false;
      logicForMessageHandler = null;
      log('No longer listening to user response for conversation.');
    }
  } catch(e) { error(e); };
}
//end conversation

//is player loaded check;
function isPlayerLoaded(){
  try {
    if (Player !== ''){return true} else {return false};
  } catch(e) {
    error(e);
  };
};

//respond function:
function respond(msg, channelID, user, userID){
  try {
        bot.sendMessage({
          to: channelID,
          message: msg
        }, function callback(error){
          if (error !== null){
            log(error)
          }
        })
      } catch(e) { error(e); };
}
//end respond logic

//purge function logic
function purgeCmd(message, channelID, user, userID){
  try {

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
        } catch(e) { error(e); };
      }
//finish purge method

//setglobal prefix method;
function setprefixCmd(user, userID, channelID, message){
  try {
      var newPrefix = getArg(prefix + 'setprefix', message);
      log(newPrefix);
      bot.sendMessage({to: channelID, message: 'Setting new command prefix: ' + newPrefix + '. This will be ready after restart.'},
      function callback(err){
        config.prefix = newPrefix;
        log('Prefix changed to ' + newPrefix + '. Applying change to JSON file now.');
        fs.writeFile('./config.json', JSON.stringify(config, null, 2), function callback(err){
          log('File write completed Successfully. New prefix: ' + newPrefix + ' now applied.');
          respond('New prefix: ' + newPrefix + ' now applied. Changes will take effect on bot reboot. _do ' + prefix + 'restart_', channelID);
        });
      })
    } catch (e) { error(e); };
  }
//end set prefix method;

//grabs arguments for input command.
function getArg(cmd, msg, channelID){
  try {
    var args = msg.substring(cmd.length + 1, msg.length);
    if (args.length > 0){//arguments exist;
      return args;
    } else {// no arguments, return usage.
      bot.sendMessage({
        to: channelID,
        message: help.usage[cmd]
      })
    }
  } catch(e) {error(e); };
}
//end get command arguments function

//function to check if command is contained within input string / message.
function cmdIs(cmdName, message){
  try {
    if (message.substring(0 + prefix.length, cmdName.length + 1) === cmdName) {

      return true

    } else {return false};
  } catch(e) { error(e); };
  }
//end check if command function;

//generates help command info;
function generateHelp(){
  try {
    var fullHelp = '**reCord bot v' + config.ver + '** find on Github: https://github.com/Vizcosity/discord.gi \n\nif it doesnt work deal with it' + '```';
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
  } catch(e){ error(e); };
}
//end generate help function;

//find random number;
function randomIntFromInterval(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
//end random number function

//checks if command has arguments;
function hasArgs(cmd, message, type){
  try {
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
      log(cmd + ' has no arguments. Returning false');
      return false
    }
  } catch(e){ error(e); };
}
//end check to see if cmd has arguments function

//print whole object
function printObject(o) {
  var out = '';
  for (var p in o) {
    out += p + ': ' + o[p] + '\n';
  }
  return(out);
}
//end print obj Array

//BUDI
function BUDI(channel){
    try {
    var loaded, continueLoop,
    loopArray = true, stayAsLatestMsg = true;
    //initiate BUDI by sending msg to channel.
    /* bot.sendMessage({
      to: channel,
      message: msgArray[0]
    }, function(error, response){
      if (error !== null){console.log(error)};
      var msgID = response.id;
      var i = 0;
      bot.editMessage({
        channelID: channel,
        messageID: msgID,
        message: msgArray[i]
      }, function(err, response){
        if (err !== null){console.log(err)};
        i++;
        editMsgLoop(msgArray[i]);
      });

      function alternateMsgArray(arr, outputVar){

      }




    }); */

    continueLoop = true;
    this.start = function(msgArray){
      var msgID;
      loaded = true;
      var i = 1;
      bot.sendMessage({
        to: channel,
        message: msgArray[0]
      }, function(err, response){
        if (err !== null){log(err)};
        if (response !== 'undefined'){
          msgID = response.id
        } else {log('No response.')};


              editMsgLoop(msgArray[i]);//start msg loop

              function editMsgLoop(editedMsg){

                if (continueLoop){

                if (loaded !== true){loaded = true};
                if (i < msgArray.length){

                    bot.editMessage({
                      channelID: channel,
                      messageID: msgID,
                      message: editedMsg
                    }, function(error, response){
                      if (error !== null){log(error)};
                      if (typeof response !== 'undefined'){//response recieved
                        if (response.content === msgArray[i]){//edited Successfully

                      i++;
                      setTimeout(carryOnLoopingEditMsg, 1000);

                      function carryOnLoopingEditMsg(){
                        isBUDItheLatestMsg();
                        if (loopArray && i === msgArray.length){
                          //reset i;
                          i = 0;
                          editMsgLoop(msgArray[i]);
                          } else {//no loop, continue normally till end of array.
                          editMsgLoop(msgArray[i]);}
                        }
                      }
                    } else {//no response.
                      log('No response frome edit Msg.')
                    }

                  });
                } //checks if index is within array

                } else {
                  log('Loop cancelled or finished')
                }

              }
              //end define editmsg loop

              function isBUDItheLatestMsg(){
                if (loaded){
                  //console.log('BUDI Loaded, proceeding to get msg.');
                bot.getMessages({
                  channelID: channel,
                  limit: 1
                }, function(error, results){
                  var output;
                  //console.log(results[0].id);
                  if (error !== null){log(error)};
                  if (results !== 'undefined'){
                    if (results[0] !== 'undefined'){
                      if(results[0].id === msgID){//id's match, it is latest msg
                        return makeBUDILatestMsg(true);
                      } else {
                        return makeBUDILatestMsg(false);
                      }
                    } else {log('first result item not defined')}
                  } else {log('results not defined')}
                  //console.log(output);
                });} else {
                  //not loaded
                  log('BUDI not loaded. Cannot check if it is latest msg.');
                }

              }
              //end define is latest msg BUDI function

              function makeBUDILatestMsg(trueOrFalse){
                //  while (isBUDItheLatestMsg() === 'undefined'){console.log('waiting for output');/*wait*/}
                //console.log('BUDI result is ' + trueOrFalse);
                if (loaded && trueOrFalse === false){//loaded and budi not latest msg.
                  //delete msgID
                  bot.deleteMessage({
                    channelID: channel,
                    messageID: msgID
                  }, function(error){
                    if (error !== null){
                      log(error);
                    } else {
                    //after message deleted, send new message.
                    bot.sendMessage({
                      to: channel,
                      message: msgArray[i]
                    }, function(error, response){
                      if (error !== null){log(error)};
                      if (response !== 'undefined'){
                        if (response.id !== 'undefined'){
                          msgID = response.id;
                        }
                      }
                    });
                    }
                  });
                  //end delete method
                  } else {
                    var errorMsg = '';
                    if (loaded !== true){errorMsg = 'BUDI not loaded\n';};
                    if (trueOrFalse){errorMsg = 'BUDI already latest message'}
                    //console.log(errorMsg);
                    //console.log(loaded);
                    //console.log('BUDI:' + trueOrFalse);
                  }
              }
              //end reshift BUDI to latest msg method.
            //  makeBUDILatestMsg();

      }//end sendmsg callback
      )

    }//end this.start msg loop

    this.stop = function(){
      if (loaded){
      continueLoop = false;} else {
        log('no loop running');
      }
    }
  } catch(e) { error(e); };
  };
//end define budi

//define is last message
function isLastMessage(msgID, channelIDCODE){
  try  {
    bot.getMessages({
      channelID: channelIDCODE,
      limit: 1
    }, function(error, messageArr){
      if (error !== null){console.log(error)};
      if (messageArr[0].id === msgID){ return true } else {return false}
    });
  } catch(e){error(e);};
}
//end is last message

//mention the user in chat;
function mention(userID){
  try {
    return '<@' + userID + '>';
  } catch(e) {
    error(e);
  }
}
//mention the user in chat

//set cooldown
function setCooldown(command, del){
  console.log('Cooldown on ' + prefix + command + ' set for ' + del)
  cooldown = true;
  cmdToCooldown = command;
  delay = del;
  //setting the global variables;

  setTimeout(function(){
  console.log('Cooldown on ' + prefix + command + ' finished after ' + del)
    clearInterval(delayCountdown);
    cooldown = false;
    cmdToCooldown = '';
    delay = 0;
    activeDelay = 0;
  }, del);
}
//end set cooldown

function coolDownResponder(channel){
  var currentMsgID;
  var continueLoop = true;
  //BUDI pre-requisites
  function BUDI(channel){
    var msgID;
    var loaded;
    this.start = function(changingMessage){
      loaded = true;
      bot.sendMessage({
        to: channel,
        message: changingMessage()
      }, function(err, response){
        if (err !== null){console.log(err)};
        if (response !== 'undefined'){
          try {
            msgID = response.id;
          } catch(e){ log(e)};
        } else {console.log('No response.')};

              editMsgLoop(changingMessage)

              function editMsgLoop(buildMSG){
                //console.log()
                if (continueLoop && cooldown){
                //isBUDItheLatestMsg();
                //console.log('got to the edit msg loop');
                if (loaded !== true){loaded = true};
                var editMsgToSend = changingMessage();
                bot.editMessage({
                  channelID: channel,
                  messageID: msgID,
                  message: editMsgToSend
                }, function(error, response){
                  if (error !== null){console.log(error)};
                  if (typeof response !== 'undefined'){//response recieved
                    if (response.content === editMsgToSend){//edited Successfully

                      setTimeout(carryOnLoopingEditMsg, 1000);

                      function carryOnLoopingEditMsg(){
                          editMsgLoop(changingMessage);
                      }
                    }
                  } else {//no response.
                    console.log('No response frome edit Msg.')
                  }

                });
            } else {
              console.log('Loop cancelled or finished');
              try {
                //console.log('trying to delete')
                bot.deleteMessage({
                  channelID: channel,
                  messageID: msgID
                }, function(err){ if (err !== null) console.log('end loop delete err: ' + err)});
              } catch (e) { log(e); };
            }

            }//end define editmsg loop
      }//end sendmsg callback
      )

    }//end this.start msg loop

    this.stop = function(){
      if (loaded){
        continueLoop = false;
        secondsLeft = 0;
        Bot.deleteMessage({
          channelID: announcementChannel,
          messageID: msgID
        })
      } else {
        console.log('no loop running');
      }
    }

    function isBUDItheLatestMsg(){
      if (loaded){
        //console.log('BUDI Loaded, proceeding to get msg.');
      Bot.getMessages({
        channelID: channel,
        limit: 1
      }, function(error, results){
        var output;
        //console.log(results[0].id);
        if (error !== null){console.log(error)};
        if (results !== 'undefined'){
          if (results[0] !== 'undefined'){
            if(results[0].id === msgID){//id's match, it is latest msg
              return makeBUDILatestMsg(true);
            } else {
              return makeBUDILatestMsg(false);
            }
          } else {console.log('first result item not defined')}
        } else {console.log('results not defined')}
        //console.log(output);
      });} else {
        //not loaded
        console.log('BUDI not loaded. Cannot check if it is latest msg.');
      }

    }
    //end define is latest msg BUDI function

    function makeBUDILatestMsg(trueOrFalse){
      //  while (isBUDItheLatestMsg() === 'undefined'){console.log('waiting for output');/*wait*/}
      //console.log('BUDI result is ' + trueOrFalse);
      if (loaded && trueOrFalse === false){//loaded and budi not latest msg.
        //delete msgID
        Bot.deleteMessage({
          channelID: channel,
          messageID: msgID
        }, function(error){
          if (error !== null){
            console.log(error);
          } else {
          //after message deleted, send new message.
          Bot.sendMessage({
            to: channel,
            message: buildProgressBar()
          }, function(error, response){
            if (error !== null){console.log(error)};
            if (response !== 'undefined'){
              if (response.id !== 'undefined'){
                msgID = response.id;
              }
            }
          });
          }
        });
        //end delete method
        } else {
          var errorMsg = '';
          if (loaded !== true){errorMsg = 'BUDI not loaded\n';};
          if (trueOrFalse){errorMsg = 'BUDI already latest message'}
          //console.log(errorMsg);
          //console.log(loaded);
          //console.log('BUDI:' + trueOrFalse);
        }
    }
    //end reshift BUDI to latest msg method.
  //  makeBUDILatestMsg();

  };
  //end define budi

  //build the progress bar;
  //var incrementer = 0;
  function buildCooldownMessage(){
    return cooldownResponse;
  }

  editLooper = new BUDI(channel);
  editLooper.start(buildCooldownMessage);


}
//end define progress bar func
