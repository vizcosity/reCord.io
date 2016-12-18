/*
* VOICE module.
* sudo ffmpeg -f s16le -ar 48.0k -ac 2 -i test2.pcm fileConv.wav
*/

var Messenger = require("../snippets/message.js");
var fs = require('fs');
__parentDir = require('path').dirname(process.mainModule.filename);
var spawn = require('child_process').spawn;
var ffmpeg = require('fluent-ffmpeg');

function voice(bot, channelID, serverID, userID, callback){
  // Initiate a voice instance for this userID.
  console.log("[VOIDE.JS] Module loaded.");

  // Initialize messenger instance in case of errors / feedback.
  var msg = new Messenger(bot, channelID);

  // Grab the VoiceID that would like to join.
  var voiceIDQuery = getVoiceID(bot, serverID, userID);
  if (!voiceIDQuery.result) return msg.error("I couldn't get the Voice Channel: " + voiceIDQuery.reason);
  var voiceID = voiceIDQuery.result;
  var busy = false;
  var write;
  var self = this;

  // This stream object will be assigned the stream obj once audio context is collected.
  // When this is not null, audio can be piped to it. Otherwise it cannot be.
  var stream = null;

  // CHECKS
  if (botInVoiceChannel(bot, voiceID)) return;

  joinVoice(bot, voiceID, function(){
    getStream(voiceID, function(streamRef){
      stream = streamRef;
      log("Stream assigned.");
      if (callback) callback();
    })
  });

  this.playAudio = function(file, paramObj){
    log("Playing: " + file);
    try {
      if (!check().result) {
        log("Check failed: " + check().reason);
        return check().reason;
      };
      // Play an audio file (local / mp3 direct) that is specified.

      // Grab audio context if it hasn't been collected.
      try {

        fs.createReadStream(__parentDir+file).pipe(stream, {end: false});

        stream.once('done', function(){
            // Make module available for other files to play, and possibly leave.
            busy = false;
            //log("Busy set to: " + busy);
            if (paramObj && paramObj.leave){
              // If paramObj.leave
              self.leaveVoice();
            }
        });

      } catch(e){ log(e); };


    } catch(e){ log(e); };
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

      busy = false;
      console.log("Recording finished.");
  }

  this.leaveVoice = function(){
    log("Leaving: " + voiceID);
    bot.leaveVoiceChannel(voiceID);
    busy = false;
  }

  // Check if the voice channel is empty every minute.
  // If so, leave.
  setTimeout(checkEmpty, 60000);

  // FUNCTIONS THAT REQUIRES SCOPE
  function checkInVoice(){
    // Before any function is called that depends on being in a voice channel,
    // this command checks if it is prepared.

    // Check if the bot is in the proper voice channel.
    if (!botInVoiceChannel(bot, voiceID)) joinVoice(bot, voiceID);
  }

  function checkEmpty(){
    // Check if there is anyone in the voice channel.
    if (botInVoiceChannel(bot, voiceID) && Object.keys(getUsersInVoiceChannel(bot, voiceID)).length == 1){
      // The bot is the only user in the voice channel, leave.
      msg.notify("Leaving `" + resolveNameFromID(bot, voiceID) + "` as it is empty.");
    }
  }

  function check(){
    // Check if bot is in the voice channel.
    checkInVoice();

    // Check if the voice module is busy.
    if (busy) return {result: false, reason: "Voice module is busy."};

    // If is isn't busy, set it to busy.
    busy = true;

    return {result: true, reason: null};
  }

}


function log(message){
  console.log("[VOICE.JS] " + message);
}

function joinVoice(bot, voiceID, callback){
  var streamReference;
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
  } catch(e){ log("Getting audio context: " + e)}
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
