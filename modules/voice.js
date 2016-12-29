/*
* VOICE module.
* sudo ffmpeg -f s16le -ar 48.0k -ac 2 -i test2.pcm fileConv.wav
*/

// Dependencies
var Messenger = require("../snippets/message.js");
var fs = require('fs');
var request = require('request');
var path = require('path');
__parentDir = require('path').dirname(process.mainModule.filename);
var spawn = require('child_process').spawn;
var childProc = require('child_process');
var queueUtility = require('./queue');
var mkdirp = require('mkdirp');
var subCommand = require('../commands/subCommands');

function voice(bot, channelID, serverID, userID, callback){
  // Initiate a voice instance for this userID.
  console.log("[VOICE.JS] Module loaded.");

  // Initialize messenger instance in case of errors / feedback.
  var msg = new Messenger(bot, channelID);

  // Grab the VoiceID that would like to join.
  var voiceIDQuery = getVoiceID(bot, serverID, userID);
  var voiceID = voiceIDQuery.result;
  if (!voiceIDQuery.result) msg.error("I couldn't get the Voice Channel: " + voiceIDQuery.reason);

  var instance = {};
  // Set up instance for the server. This is to prevent confusion between servers to isolate completely.
  // I'm not quite sure even though the voice instance is supposed to be isolated per-server there are still
  // some cases where music may leek or requests / queues get confused between servers.
  instance[serverID] = {
    ffmpeg: null,
    queue: [],
    state: {
      active: false,
      queue: false
    },
    currentSong: null,
    voiceID: voiceID,
    stream: null,
    write: null,
    checkEmptyRunning: null
  }

  // Global variable reference to 'this'
  var self = this;

  // CHECKS
  if (botInVoiceChannel(bot, instance[serverID].voiceID)) return log("Bot already in voice.");
  joinVoice(bot, instance[serverID].voiceID, function(){
    log("Joined: " + voiceID);
    getStream(voiceID, function(streamRef){
      instance[serverID].stream = streamRef;
      log("Stream assigned.");
      if (callback) callback();
    })
  });

  this.queue = function(cmd){

    // Update the state so that the module knows who / what / server/ channel to target and respond to.
    updateState(cmd);

    // Log queue call for debugging.
    log("Queue called.");

    msg.setCID(channelID); // Replaced from cmd.channelID due to implementation of updateState() that should address global variable obseletion.

    // Sub command handler. Checks if another subcommand e.g. >queue >shuffle is entered, and handles accordingly.
    if (validSubCommand("queue", cmd)) return subCommandHandler("queue", cmd); // Experimental new sub-command handler.

    // Checking to see if it is a blank request and if it should be searched for or not.
    if (queueUtility.blankRequest(cmd.arg)) return msg.embed(queueUtility.buildPrintedQueueEmbedObject(instance[serverID].queue));

    // Validate link to ensure it is in correct format.
    if (queueUtility.isLink(cmd.arg) && !queueUtility.validateInput(cmd.arg).result) return msg.error(queueUtility.validateInput(cmd.arg).reason);

    // Parse input into a raw id.
    var request = cmd.arg;

    log("REQUEST: " + request);

    try {
      // Request the title, duration, and playable url.
      queueUtility.getYTDetails(request, function(details){

        if (!details.result) return msg.error("Could not queue item. \n" + details.reason);
        instance[serverID].queue.push( new queueUtility.item( instance[serverID].queue.length, cmd.sID, 'queue', bot.users[cmd.uID].username, cmd.uID, details.title, details.duration, details.url, details.videoID) );

        var lastQueueItem = instance[cmd.sID].queue[ instance[cmd.sID].queue.length - 1 ];

        try {
          // Notify that the item has been successfully queued.
          msg.embed(queueUtility.buildQueuedNotificationEmbedObject(lastQueueItem, queueUtility.getEta(instance[cmd.sID].queue)), 10000);

          // Download the file.
          downloadAudioFile(lastQueueItem.url, cmd.sID, lastQueueItem.localFileName, function(){

            // Pop first item from queue, and play it once details are collected.
            instance[serverID].state.queue = true;

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

        if (!status.result) return msg.error(status.reason);

        instance[serverID].state.queue = true;

        instance[serverID].ffmpeg = childProc.spawn('ffmpeg', [
          '-loglevel', '0',
          '-i', file,
          '-af', 'volume=' + '0.5',
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          'pipe:1'
        ], {stdio: ['pipe', 'pipe', 'ignore']});

        instance[serverID].ffmpeg.on('error', function(error){
          log("FFMPEG: " + error);
        });

        instance[serverID].ffmpeg.on('exit', function(code, signal){
          log("FFMPEG exited with code: "+code+" and signal: " + signal);
        })

        instance[serverID].ffmpeg.stdout.once('readable', function(){

          instance[serverID].state.active = true;

          log("Playing: " + item.title + " ["+item.duration+"]");

          // Once the stream is readable, pipe to the cjopus stream.
          instance[serverID].stream.send(instance[serverID].ffmpeg.stdout, {end: false});

          // Trying out pipe instead of send to stream.
          // instance[serverID].ffmpeg.pipe(instance[serverID].stream, {end: false});

          // Testing
          // fs.createReadStream(file).pipe(instance[serverID].stream, {end: false});

        })

        instance[serverID].ffmpeg.stdout.once('end', function(){
          // Make module available for other files to play, and possibly leave.
          instance[serverID].ffmpeg.kill();
          instance[serverID].state.active = false;
          log("Finished Playing: " + item.title + " ["+item.duration+"]");
          deleteAudioFile(file); // Deletes the audio file after it is done playing.
          queueCheck();
        });

      }); // End of download File callback.

    }); // End of check callback.

  }

  this.shuffleQueue = function(cmd){

    // Update global variables.
    updateState(cmd);

    // Handle error if no queue or too small
    if (instance[cmd.sID].queue.length <= 1)
      return msg.error(
        instance[cmd.sID].queue ?
        "Queue size "+instance[cmd.sID].queue.length+" is too small to be shuffled." :
        "There is no queue."
      );

    // Reassign shuffled queue.
    instance[serverID].queue = queueUtility.shuffleQueue(instance[serverID].queue);
    msg.notify("Queue shuffled.");
    msg.embed(queueUtility.buildPrintedQueueEmbedObject(instance[serverID].queue));

  }

  this.clearQueue = function(cmd){

    // Update State.
    updateState(cmd);

    // Handle error if no queue or too small
    if (instance[cmd.sID].queue.length === 0)
      return msg.error(
        instance[cmd.sID].queue ?
        "There is nothing in the queue to be cleared / removed." :
        "There is no queue."
      );


    queueUtility.clearQueueHandler(cmd, instance[serverID].queue, function(newQueue, error, notification){
      if (error) return msg.error(error);
      if (newQueue) instance[cmd.sID].queue = newQueue;
      if (notification) msg.embedNotify(notification, "Cleared by "+ cmd.user);
    });

  }

  this.skip = function(cmd){

    // Update global variables.
    updateState(cmd);

    log("Attempting to skip.");
    if (instance[cmd.sID].ffmpeg) instance[cmd.sID].ffmpeg.kill();
    msg.setCID(cmd.cID);
    msg.embedNotify("**Skipping**: "+ (instance[cmd.sID].currentSong && instance[cmd.sID].currentSong.title ? instance[cmd.sID].currentSong.title : "Item") + "", cmd.user + " executed skip.");
    queueCheck();
  }

  this.playAudio = function(cmd, paramObj){

    // Global variables *should* have been updated before reaching this point.
    updateState(cmd);

    // Set the file from the command argument.
    var file = cmd.arg;

      check(function(status){
        if (!status.result) return msg.error(status.reason);
        try {

          instance[serverID].state.active = true;

          instance[serverID].stream.playAudioFile(file);

          instance[serverID].stream.once('done', function(){
              // Make module available for other files to play, and possibly leave.
              instance[serverID].state.active = false;
              //log("Busy set to: " + busy);
              if (paramObj && paramObj.leave){
                // If paramObj.leave
                self.leaveVoice({sID: serverID});
              }
          });

        } catch(e){ log(e); };

      })

  }

  this.recordStart = function(cmd){

    // Update global variables for this request.
    updateState(cmd);

    check(function(status){

      if (!status.result) return msg.error(status.reason);

      // Grab new audio context with maxstreamlength for audio recording.
      bot.getAudioContext({channelID: instance[serverID].voiceID, maxStreamSize: 50 * 1024}, function(error, stream) {

      var date = new Date();
      date = date.toString();

      console.log("Date string: " + date);
      // Replace spaces in date with underscores.
      date = date.replace(/\s/g, '_');

      console.log("Date string: "+date);

      if (error) console.log(error);
        instance[serverID].state.active = true;
        instance[serverID].write = fs.createWriteStream(__parentDir+'/audio/recordings/'+date+".pcm");
        stream.pipe(write);

      console.log("RECORDING VOICE");

      });
    })


  }

  this.recordStop = function(cmd){

    // Update global variables to match command origin.
    updateState(cmd);

      write.close(function(){
        getMostRecentRecording(function(filename){
          var path = __parentDir+'/audio/recordings/';
          decode(path, filename);
        });
      });

      instance[serverID].state.active = false;
      console.log("Recording finished.");
  }

  // Leaves the voice channel and configures the environment after that accordingly.
  this.leaveVoice = function(cmd){

    // Update global variables to match command origin.
    updateState(cmd);

    // Update server id to match where command originated.
    serverID = cmd.sID;
    instance[serverID].voiceID = updateVoiceID(serverID);
    if (!instance[serverID].voiceID) return msg.error("I am not in a voice channel.");

    // Notify of leaving voice.
    log("Leaving: " + instance[serverID].voiceID+": "+resolveNameFromID(bot, instance[serverID].voiceID));
    bot.leaveVoiceChannel(instance[serverID].voiceID);


    // Configure environment properly for leaving voice channel.
    instance[serverID].state.active = false;
    instance[serverID].state.queue = false;

    // Clear the stream.
    instance[serverID].stream = null;

    // Move the 'currentSong' (if there is one) to the queue so that it doesn't
    // auto-play or request on join, and clear the currentSong.
    if (instance[serverID].currentSong) {
      try {
        instance[serverID].queue.unshift(instance[serverID].currentSong);
        instance[serverID].currentSong = null;
      } catch(e){log("Error preparing queue for leaveVoice: " + e)}
    }

    // Check if ffmpeg instance is on, and kill it if so.
    if (instance[serverID].ffmpeg) instance[serverID].ffmpeg.kill();

  }

  this.joinVoice = function(cmd){

    // Update global voice variables.
    updateState(cmd);

    log("Joinvoice called.");

    // Set new voice channel if there is one.
    // Grab the VoiceID that would like to join.
    voiceIDQuery = getVoiceID(bot, cmd.sID, cmd.uID);
    if (!voiceIDQuery.result) return msg.error("I couldn't find your Voice Channel: " + voiceIDQuery.reason);
    instance[cmd.sID].voiceID = voiceIDQuery.result;

    if (!botInVoiceChannel(bot, instance[cmd.sID].voiceID)) {
      joinVoice(bot, instance[cmd.sID].voiceID, function(){
        getStream(instance[cmd.sID].voiceID, function(streamReference){
          instance[cmd.sID].stream = streamReference;
          // If previous queue exists, resume playing it.
          if (instance[cmd.sID].queue.length !== 0) resumeQueue();
        })
      })
    }
  }

  // FUNCTIONS THAT REQUIRES SCOPE
  function checkInVoice(callback){
    // Before any function is called that depends on being in a voice channel,
    // this command checks if it is prepared.

    // Set new voice channel if there is one.
    // Grab the VoiceID that would like to join.
    voiceIDQuery = getVoiceID(bot, serverID, userID);
    if (!voiceIDQuery.result) return msg.error("I couldn't find your Voice Channel: " + voiceIDQuery.reason);
    instance[serverID].voiceID = voiceIDQuery.result;

    // Check if the bot is in the proper voice channel.
    if (!botInVoiceChannel(bot, instance[serverID].voiceID)) {
      joinVoice(bot, instance[serverID].voiceID, function(){
        getStream(instance[serverID].voiceID, function(streamReference){
          instance[serverID].stream = streamReference;
          if (callback) callback();
        })
      })
    } else if (!instance[serverID].stream){
      getStream(instance[serverID].voiceID, function(streamRef){
        instance[serverID].stream = streamRef;
        if (callback) callback();
      })
    } else {
      if (callback) callback();
    }
  }

  function checkEmpty(){

    log("Checking if empty.");

    // Assign that check empty is running.
    instance[serverID].checkEmptyRunning = true;

    instance[serverID].voiceID = updateVoiceID(serverID);
    // Check if there is anyone in the voice channel.
    if (botInVoiceChannel(bot, instance[serverID].voiceID) && Object.keys(getUsersInVoiceChannel(bot, instance[serverID].voiceID)).length == 1){
      // The bot is the only user in the voice channel, leave.
      msg.notify("Leaving `" + resolveNameFromID(bot, instance[serverID].voiceID) + "` as it is empty.");
      self.leaveVoice({sID: serverID});
    }

    // Call function again recursively to check if there is anyone connected in the voice channel.
    if (instance[serverID].checkEmptyRunning && botInVoiceChannel(bot,instance[serverID].voiceID)){
      return setTimeout(checkEmpty, 300000); // Check every 5 minutes.
    }

    // Return false if the checkEmpty recursion has finished.
    instance[serverID].checkEmptyRunning = false;

    // Anounce that checkEmpty is no longer runnig.
    log("CheckEmpty instance closed.");
  }

  function updateVoiceID(serverID){
    var voiceID = false; // Requires to be disproven that it is not in a voice channel.

    // Looks for which channel the bot is connected to on the server and updates voiceID accordingly.
    for (var key in bot._vChannels){
      //log("Testing " + key);
      if (bot._vChannels[key].serverID == serverID) {
        voiceID = key;
        //log("Success");
        break;
      }
    }

    return voiceID;
  }

  function updateState(cmd){
    // Grabs the newest details from the cmd object and reassigns global variables accordingly to
    // avoid confusion.
    channelID = cmd.cID;
    serverID = cmd.sID;
    userID = cmd.uID;
    instance[serverID].voiceID = updateVoiceID(serverID);
    log("VoiceID updated to: " + resolveNameFromID(bot, instance[serverID].voiceID));
  }

  function check(callback){
    // Check if bot is in the voice channel.
    checkInVoice(function(){
      // log("Check In Voice Callback.");
      var status = {result: true, reason: null};
      // Check if the voice module is busy.
      if (instance[serverID].state.active) status = {result: false, reason: "Voice module is busy."};

      // If is isn't busy, set it to busy.
      instance[serverID].state.active = true;

      if (callback) callback(status);
    });

    // Instantiate checkempty if it hasn't been already.
    if (!instance[serverID].checkEmptyRunning) {
      // Check Empty process wrapped in a delay so that it has to wait a bit after joining the voice channel to see if it is empty or not.
      // Without this sometimes the check will report that it is empty and leave prematurely causing a fatal error as stream is attempting to be piped.
      setTimeout(function(){
        log("No checkEmpty instance. Running now. Current state: " + instance[serverID].checkEmptyRunning);
        checkEmpty();
      }, 15000);

    }
  }

  function queueCheck(){
    // log("QUEUE: " + state.queue + " ACTIVE: " + state.active);
    if (instance[serverID].state.queue && !instance[serverID].state.active) {
      playNext();
      //msg.notify(currentSong.title + " now playing.");
      if (!instance[serverID].currentSong) return; // Nothing in queue to report.
      var queueNotificationEmbedObject = queueUtility.buildEmbedObject(instance[serverID].currentSong);
      msg.embed(queueNotificationEmbedObject, instance[serverID].currentSong.duration * 1000); // Keep message for the length of the song.
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
    if (instance[serverID].queue.length > 0) instance[serverID].currentSong = instance[serverID].queue.shift();
    else return endQueueHandler();
    self.playQueueItem(instance[serverID].currentSong);
  }

  function endQueueHandler(){
    instance[serverID].currentSong = null;
    log("End of queue reached.");
    msg.notify("End of queue reached.");
  }

  function resumeQueue(){
    log("Found queue. Resuming");
    msg.notify("Resuming queue.");
    instance[serverID].state.queue = true;
    instance[serverID].state.active = false;
    queueCheck();
  }

  function validSubCommand(parent, cmd){
    try {
      // log("Checking prefix: " + containsPrefix(cmd.arg, cmd.prefix) +" subcomexists: " + subCommandExists(parent, getCmdName(cmd.arg, cmd.prefix)));
      return containsPrefix(cmd.arg, cmd.prefix) && subCommandExists(parent, getCmdName(cmd.arg, cmd.prefix));
    } catch(e){log("Validating sub command: " + e)}
  }

  function containsPrefix(message, prefix){
    try {
      return message.substring(0, prefix.length) == prefix;
    } catch(e){log("Checking if contains prefix: " + e)}
  }

  function getCmdName(message, prefix){
    try {
      return message.substring(prefix.length, message.length).split(' ')[0];
    } catch(e){ log("Getting command name: " + e)}
  }

  function subCommandExists(parent, command){
    try {
      log("Checking "+parent+": "+command+" as a valid sub-cmd.");
      if (require('../config/subCommands.json')[parent][command]) return true;
      return false;
    } catch(e){log("Checking subcommand existance: " + e)}
  }

  // Runs the subCommand module and handles subcommands.
  function subCommandHandler(parent, cmd){

    // Runs a check for sub-command existance and clearance for user to use it.
    subCommand(bot, cmd.sID, parent, function(subCmd){
      subCmd.execute(cmd, self);
    });

  }

  function log(message){
    console.log("[VOICE.JS] " + resolveNameFromID(bot, instance[serverID].voiceID) + ": "+ message);
  }
}

function log(message){
  console.log("[VOICE.JS] " + message);
}

function joinVoice(bot, voiceID, callback){
  if (!voiceID) return log("Invalid voiceID: " + voiceID);
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
    if (bot.channels[voiceID] && bot.channels[voiceID].name)
      return bot.channels[voiceID].name;

    return ""; // No voice channel found.
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
