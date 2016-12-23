/*
* VOICE module.
* sudo ffmpeg -f s16le -ar 48.0k -ac 2 -i test2.pcm fileConv.wav
*/

var Messenger = require("../snippets/message.js");
var fs = require('fs');
var request = require('request');
var path = require('path');
__parentDir = require('path').dirname(process.mainModule.filename);
var spawn = require('child_process').spawn;
//var fluentffmpeg = require('fluent-ffmpeg');
var childProc = require('child_process');
var queueUtility = require('./queue');
var mkdirp = require('mkdirp');

function voice(bot, channelID, serverID, userID, callback){
  // Initiate a voice instance for this userID.
  console.log("[VOICE.JS] Module loaded.");

  // Initialize messenger instance in case of errors / feedback.
  var msg = new Messenger(bot, channelID);

  // Grab the VoiceID that would like to join.
  var voiceIDQuery = getVoiceID(bot, serverID, userID);
  if (!voiceIDQuery.result) return msg.error("I couldn't get the Voice Channel: " + voiceIDQuery.reason);
  var voiceID = voiceIDQuery.result;
  var ffmpeg;
  var queue = {};
  queue[serverID] = [];
  //var busy = false

  var state = {};
  state[serverID] = {
    active: false,
    queue: false
  };

  var write;
  var currentSong = {};
  currentSong[serverID] = null;

  var self = this;

  // This stream object will be assigned the stream obj once audio context is collected.
  // When this is not null, audio can be piped to it. Otherwise it cannot be.
  var stream = {};
  stream[serverID] = null;

  // CHECKS
  if (botInVoiceChannel(bot, voiceID)) return log("Bot already in voice.");
  joinVoice(bot, voiceID, function(){
    log("Joined: " + voiceID);
    getStream(voiceID, function(streamRef){
      stream[serverID] = streamRef;
      log("Stream assigned.");
      if (callback) callback();
    })
  });

  this.queue = function(cmd){

    log("Queue called.");

    msg.setCID(cmd.channelID);

    // Sub command handler. Checks if another subcommand e.g. >queue >shuffle is entered, and handles accordingly.
    log(validSubCommand(cmd));
    if (validSubCommand(cmd)) return subCommandHandler(buildSubCommandObj(cmd));

    // Checking to see if it is a blank request and if it should be searched for or not.
    if (queueUtility.blankRequest(cmd.arg)) return msg.embed(queueUtility.buildPrintedQueueEmbedObject(queue[serverID]));

    // Validate link to ensure it is in correct format.
    if (queueUtility.isLink(cmd.arg) && !queueUtility.validateInput(cmd.arg).result) return msg.error(queueUtility.validateInput(cmd.arg).reason);

    // Parse input into a raw id.
    // var request = queueUtility.isLink(cmd.arg) ? queueUtility.parseInput(cmd.arg) : cmd.arg;
    var request = cmd.arg;

    log("REQUEST: " + request);

    try {
      // Request the title, duration, and playable url.
      queueUtility.getYTDetails(request, function(details){

        if (!details.result) return msg.error("Could not queue item. \n" + details.reason);
        queue[serverID].push( new queueUtility.item( queue[serverID].length, cmd.sID, 'queue', bot.users[cmd.uID].username, cmd.uID, details.title, details.duration, details.url, details.videoID) );

        var lastQueueItem = queue[cmd.sID][queue[cmd.sID].length - 1];

        try {
          // Notify that the item has been successfully queued.
          msg.embed(queueUtility.buildQueuedNotificationEmbedObject(lastQueueItem, queueUtility.getEta(queue[cmd.sID])), 10000);

          // Download the file.
          downloadAudioFile(lastQueueItem.url, cmd.sID, lastQueueItem.localFileName, function(){

            // Pop first item from queue, and play it once details are collected.
            state[serverID].queue = true;

            queueCheck();

          });
        } catch(e){ log("Could not notify of queued item: " + e)}


      });
    } catch(e){ log("Getting YT Details: " + e)}


  }

  this.playQueueItem = function(item){

    check(function(status){

      // Log download start.
      log("Downloading: " + item.title);

      downloadAudioFile(item.url, item.serverID, item.localFileName, function(file){

        // Log download finish.
        //log("Finished downloading: " + item.title);

        if (!status.result) return msg.error(status.reason);

        state[serverID].queue = true;

        ffmpeg = childProc.spawn('ffmpeg', [
          '-loglevel', '0',
          '-i', file,
          '-af', 'volume=' + '0.5',
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          'pipe:1'
        ], {stdio: ['pipe', 'pipe', 'ignore']});

        ffmpeg.on('error', function(error){
          log("FFMPEG: " + error);
        });

        ffmpeg.on('exit', function(code, signal){
          log("FFMPEG exited with code: "+code+" and signal: " + signal);
        })

        ffmpeg.stdout.once('readable', function(){

          state[serverID].active = true;

          log("Playing: " + item.title + " ["+item.duration+"]");

          // Once the stream is readable, pipe to the cjopus stream.
          stream[serverID].send(ffmpeg.stdout, {end: false});

        })

        ffmpeg.stdout.once('end', function(){
          // Make module available for other files to play, and possibly leave.
          ffmpeg.kill();
          state[serverID].active = false;
          log("Finished Playing: " + item.title + " ["+item.duration+"]");
          deleteAudioFile(file); // Deletes the audio file after it is done playing.
          queueCheck();
        });

      }); // End of download File callback.

    }); // End of check callback.

  }

  this.shuffleQueue = function(cmd){
    // log("Shuffle queue called.");
    queue[cmd.sID] = queueUtility.shuffleQueue(queue[cmd.sID]);
    msg.notify("Queue shuffled.");
    msg.embed(queueUtility.buildPrintedQueueEmbedObject(queue[serverID]))
  }

  this.skip = function(cmd){
    log("Attempting to skip.");
    if (ffmpeg) ffmpeg.kill();
    msg.setCID(cmd.cID);
    msg.embedNotify("**Skipping**: "+ (currentSong[cmd.sID] && currentSong[cmd.sID].title ? currentSong[cmd.sID].title : "Item") + "", cmd.user + " executed skip.");
    queueCheck();
  }

  this.playAudio = function(file, paramObj){

      check(function(status){
        if (!status.result) return msg.error(status.reason);
        try {

          state[serverID].active = true;

          stream[serverID].playAudioFile(file);

          stream[serverID].once('done', function(){
              // Make module available for other files to play, and possibly leave.
              state[serverID].active = false;
              //log("Busy set to: " + busy);
              if (paramObj && paramObj.leave){
                // If paramObj.leave
                self.leaveVoice();
              }
          });

        } catch(e){ log(e); };

      })

  }

  this.recordStart = function(){

    if (!check().result) return check().reason;

    bot.getAudioContext({channelID: voiceID, maxStreamSize: 50 * 1024}, function(error, stream) {

    var date = new Date();
    date = date.toString();

    console.log("Date string: " + date);
    // Replace spaces in date with underscores.
    date = date.replace(/\s/g, '_');

    console.log("Date string: "+date);

    if (error) console.log(error);
      state[serverID].active = true;
      write = fs.createWriteStream(__parentDir+'/audio/recordings/'+date+".pcm");
      stream.pipe(write);

    console.log("RECORDING VOICE");

    });
  }

  this.recordStop = function(){
      write.close(function(){
        getMostRecentRecording(function(filename){
          var path = __parentDir+'/audio/recordings/';
          decode(path, filename);
        });
      });

      state[serverID].active = false;
      console.log("Recording finished.");
  }

  // Leaves the voice channel and configures the environment after that accordingly.
  this.leaveVoice = function(){
    // Notify of leaving voice.
    log("Leaving: " + voiceID);
    bot.leaveVoiceChannel(voiceID);


    // Configure environment properly for leaving voice channel.
    state[serverID].active = false;
    state[serverID].queue = false;

    // Clear the stream.
    stream[serverID] = null;

    // Move the 'currentSong' (if there is one) to the queue so that it doesn't
    // auto-play or request on join, and clear the currentSong.
    if (currentSong[serverID]) {
      try {
        queue[serverID].unshift(currentSong[serverID]);
        currentSong[serverID] = null;
      } catch(e){log("Error preparing queue for leaveVoice: " + e)}
    }

    // Check if ffmpeg instance is on, and kill it if so.
    if (ffmpeg) ffmpeg.kill();

  }

  this.joinVoice = function(cmd){

    log("Joinvoice called.");

    // Set new voice channel if there is one.
    // Grab the VoiceID that would like to join.
    voiceIDQuery = getVoiceID(bot, cmd.sID, cmd.uID);
    if (!voiceIDQuery.result) return msg.error("I couldn't find your Voice Channel: " + voiceIDQuery.reason);
    voiceID = voiceIDQuery.result;

    if (!botInVoiceChannel(bot, voiceID)) {
      joinVoice(bot, voiceID, function(){
        getStream(voiceID, function(streamReference){
          stream[serverID] = streamReference;
          // If previous queue exists, resume playing it.
          if (queue[serverID].length !== 0) resumeQueue();
        })
      })
    }
  }

  // Check if the voice channel is empty every minute.
  // If so, leave.
  setTimeout(checkEmpty, 60000);

  // FUNCTIONS THAT REQUIRES SCOPE
  function checkInVoice(callback){
    // Before any function is called that depends on being in a voice channel,
    // this command checks if it is prepared.

    // Check if the bot is in the proper voice channel.
    if (!botInVoiceChannel(bot, voiceID)) {
      joinVoice(bot, voiceID, function(){
        getStream(voiceID, function(streamReference){
          stream[serverID] = streamReference;
          if (callback) callback();
        })
      })
    } else {
      if (callback) callback();
    }
  }

  function checkEmpty(){
    // Check if there is anyone in the voice channel.
    if (botInVoiceChannel(bot, voiceID) && Object.keys(getUsersInVoiceChannel(bot, voiceID)).length == 1){
      // The bot is the only user in the voice channel, leave.
      msg.notify("Leaving `" + resolveNameFromID(bot, voiceID) + "` as it is empty.");
      self.leaveVoice();
    }
  }

  function check(callback){
    // Check if bot is in the voice channel.
    checkInVoice(function(){
      // log("Check In Voice Callback.");
      var status = {result: true, reason: null};
      // Check if the voice module is busy.
      if (state[serverID].active) status = {result: false, reason: "Voice module is busy."};

      // If is isn't busy, set it to busy.
      state[serverID].active = true;

      if (callback) callback(status);
    });

  }

  function queueCheck(){
    // log("QUEUE: " + state.queue + " ACTIVE: " + state.active);
    if (state[serverID].queue && !state[serverID].active) {
      playNext();
      //msg.notify(currentSong.title + " now playing.");
      if (!currentSong[serverID]) return; // Nothing in queue to report.
      var queueNotificationEmbedObject = queueUtility.buildEmbedObject(currentSong[serverID]);
      msg.embed(queueNotificationEmbedObject, currentSong[serverID].duration * 1000); // Keep message for the length of the song.
    }
  }

  function downloadAudioFile(url, serverID, localFileName, callback){
    // Saves to /audio/cache/serverID by default.

      // Check callback exists.
      // if (!callback) return log("No callback found for downloadAudioFile.");

      // Check to see if the serverID directory has been set up.
      // If it hasn't, create one.
      mkdirp('./audio/queue/cache/'+serverID, function(err){

        if (err) return log("Failed making / accessing directory for " + serverID + ": " + err);

        // Prepare the filename.
        var fullFileName = localFileName + '.wav';

        // Prepare relative path.
        var relativePath = './audio/queue/cache/'+serverID+'/'+fullFileName;

        // Prepare full absolute path.
        var fullPath = path.resolve(relativePath);

        // If file has been downloaded already, queue it.
        if (fs.existsSync(fullPath)) {
          log("File: " + fullPath + " already exists. Using that instead of re-downloading.");
          return callback(fullPath);
        }; // File has already been downloaded.

        // Create a writeStream with the name of the file.
        var fileOutput = fs.createWriteStream(relativePath);

        // Start the request and write to file.
        request(url).pipe(fileOutput);

        // On finish, run the callback and pass in the full path to the downloaded file.
        fileOutput.on('finish', function(){
            log("Finished downloading: " + localFileName);
            if (callback) callback(fullPath);
        });

      });
  }

  function deleteAudioFile(pathToFile){
    fs.unlink(pathToFile);
    log("Cleared: " + pathToFile);
  }

  function playNext(){
    if (queue[serverID].length > 0) currentSong[serverID] = queue[serverID].shift();
    else return endQueueHandler();
    self.playQueueItem(currentSong[serverID]);
  }

  function endQueueHandler(){
    currentSong[serverID] = null;
    log("End of queue reached.");
    msg.notify("End of queue reached.");
  }

  function resumeQueue(){
    log("Found queue. Resuming");
    msg.notify("Resuming queue.");
    state[serverID].queue = true;
    state[serverID].active = false;
    queueCheck();
  }

  function validSubCommand(cmd){
    try {
      log("Checking prefix: " + containsPrefix(cmd.arg, cmd.prefix) +" subcomexists: " + subCommandExists(getCmdName(cmd.arg, cmd.prefix)));
      return containsPrefix(cmd.arg, cmd.prefix) && subCommandExists(getCmdName(cmd.arg, cmd.prefix));
    } catch(e){log("Validating sub command: " + e)}
  }

  function containsPrefix(message, prefix){
    try {
      log("Checking: "+ message + " prefix: "+ prefix + " with length: " + prefix.length);
      return message.substring(0, prefix.length) == prefix;
    } catch(e){log("Checking if contains prefix: " + e)}
  }

  function getCmdName(message, prefix){
    try {
      return message.substring(prefix.length, message.length).split(' ')[0];
    } catch(e){ log("Getting command name: " + e)}
  }

  function buildSubCommandObj(cmd){

    // Return built cmd object.
    return {
      sID: cmd.sID,
      message: cmd.arg,
      name: getCmdName(cmd.arg, cmd.prefix),
      arg: getCmdArguments(cmd.arg, cmd.prefix), // This will be changed when passed into the and function.
      user: cmd.user,
      uID: cmd.uID,
      channelID: cmd.channelID,
      cID: cmd.channelID,
      event: cmd.event,
      //util: self,
      // Check if the server has set a prefix, and assign it.
      prefix: self.prefix
    }
  }

  function getCmdArguments(message, prefix){
    var preCmd = message.substring(0, prefix.length + getCmdName(message, prefix).length + 1);
    return message.substring(preCmd.length, message.length);
  }

  function subCommandExists(command){
    try {
      if (require('../config/subCommands.json')[command]) return true;
      return false;
    } catch(e){log("Checking subcommand existance: " + e)}
  }

  function subCommandHandler(cmd){
    log("Subcommand detected: " + cmd.name);
    switch(cmd.name){
      case "shuffle":
        self.shuffleQueue(cmd);
        break;
      default:
      return log("Sub command not recognized.");
    }
  }

}

function log(message){
  console.log("[VOICE.JS] " + message);
}

function joinVoice(bot, voiceID, callback){
  log("Joining: " + voiceID);
  bot.joinVoiceChannel(voiceID, function(err, res){
    if (err) console.log(err);
    if (callback) callback();
  });
}

function getStream(voiceID, callback){
  //var streamRef = null;
  try {
    // Grab the audio Context.
    log("Attempting to grab audio context.");
    bot.getAudioContext({channelID: voiceID}, function(error, stream){
      log("Grabbed audio context");
      if (error) return log(error);
      //streamRef = stream;
      callback(stream);
    });
  } catch(e){ log("Error Getting audio context: " + e)}
}

function botInVoiceChannel(bot, voiceID){
  try {
    return bot._vChannels[voiceID];
  } catch(e){log("e"); return false;}
}

function resolveNameFromID(bot, voiceID){
  try {
    return bot.channels[voiceID].name;
  } catch(e){ log("Resolving name from id: " + e); return "Voice Channel"; };
}

// Ping the amount of users in the voice chat every minute.
// If there is no one in the voice channel, leave.
function getUsersInVoiceChannel(bot, voiceID){
  try {
    return bot.channels[voiceID].members;
  } catch(e){ log("Getting users in voice: " + e); }
}

function getMostRecentRecording(callback){
  // Get the most recent recording.
  fs.readdir(__parentDir+'/audio/recordings/', function(err, resp){
    if (err) console.log(err);
    // return callback with last position in array.
    console.log("Grabbed newest recording: " + resp[resp.length-1].split('.')[0]);
    callback(resp[resp.length-1].split('.')[0]);
  });

}

function decode(pathToFile, filename){
  //* sudo ffmpeg -f s16le -ar 48.0k -ac 2 -i test2.pcm fileConv.wav
  var decoder = spawn('ffmpeg',
  ['-f', 's16le', '-ar', '48000', '-ac', '2', '-i', pathToFile+filename+".pcm", pathToFile+filename+".wav"],
  {stdio:['pipe', 'pipe', 'ignore']});

  decoder.stdout.on('end', function(){
    console.log("Finished decode.");
    decoder.kill();
  });

  decoder.stdout.on('error', function(err){
    console.log(err);
  });

  console.log("Decoder called on: "+ pathToFile+filename+".pcm");

}


function getVoiceID(bot, serverID, userID){
  try {
    if (bot.servers[serverID] && bot.servers[serverID].members[userID]){
      if (bot.servers[serverID].members[userID].voice_channel_id){
        return {
          result: bot.servers[serverID].members[userID].voice_channel_id,
          reason: null
        }
      } else {
        return {
          result: false,
          reason: "Please join a voice channel."
        }
      }
    }
  } catch(e){console.log(e);};
  return {
    result: false,
    reason: "Failed to grab Voice Channel ID."
  }
}

module.exports = voice;
