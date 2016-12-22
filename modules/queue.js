// Takes in command object, sorts it out so that an item is queued (or not).
var youtubeQuery = require('./youtube');
function queue(cmd, voice){
  var link = cmd.arg;
  var queue = [];
  console.log('QUEUE');
  youtubeQuery(link, function(data){
    voice.playAudio(data.url);
  });

}

module.exports = {
  parseInput: function(input){
    // Assumes that input has already been validated.
    // Takes in a link and outputs a video id.

    if (input.indexOf('youtube') != -1){
      // Standard long link format.
      return input.split('?v=')[1];
    }

    if (input.indexOf('youtu.be') != -1){
      // Shortform link.
      return input.split('youtu.be/')[1];
    }

    return log("Could not parse input from link: " + input);
  },

  validateInput: function(input){

    if (input.split('://')[0] !== 'http' && input.split('://')[0] !== 'https')
      return {
        result: false,
        reason: 'Not a valid link.'
      };

    if ((input.indexOf('youtube') == -1) && (input.indexOf('youtu.be') == -1) )
      return {
        result: false,
        reason: "Not a valid YouTube link."
      };

    return {
      result: true,
      reason: null
    }
  },

  getYTDetails: function(query, callback){
    youtubeQuery(query, function(data){
      if (callback) return callback(data);
      return log("No callback found for getYTDetails (queue.js)");
    })
  },

  item: function(queueID, serverID, type, username, userID, songname, songduration, url, songid, playlistName){

    this.id = queueID; // This is the id of the item in the queue.
    this.serverID = serverID;
    this.type = type;
    this.username = username;
    this.userID = userID;
    this.title = songname;
    this.duration = songduration;
    this.url = url;
    this.videoID = songid;
    this.localFileName = generateLocalFileName(userID, songid);
    this.playlistTitle = (!playlistName) ? null : playlistName; // If there is no playlistItem just assign null.

    log("Item Added: " + songname + " ["+songduration+"] "+ "by " + username);
  },

  buildEmbedObject: function(queueItem){
    return {
      type: 'rich',
      color: 6826080,
      image: {url: 'https://i.ytimg.com/vi/'+queueItem.videoID+'/maxresdefault.jpg'},
      thumbnail:{url:'http://i.imgur.com/mfKMA9t.png'},
      footer: {text:'Requested By '+queueItem.username+' | '+convertSecondsToMinutesAndSeconds(queueItem.duration)},
      description: '**Now Playing**: ' + queueItem.title + "\n**Source**:" + " http://youtu.be/"+queueItem.videoID
    }
  },

  buildQueuedNotificationEmbedObject: function(queueItem, eta){
    return {
      type: 'rich',
      color: 1146534,
      thumbnail:{url:'http://i.imgur.com/JO4b5GH.jpg'},
      footer: {text:'Requested By '+queueItem.username+' | ETA: '+convertSecondsToMinutesAndSeconds(eta)},
      description: '**Successfully queued**: ' + queueItem.title + "\n**Source**: " + "http://youtu.be/"+queueItem.videoID
    }
  },

  getEta: function(queue){
    return getEtaGlobal(queue);
  },

  isLink: function (query){
    return (query.split(':')[0] == 'http') || (query.split(':')[0] == 'https');
  },

  blankRequest: function(message){
    // Checks if the request is blank. Useful to check if the queue should be printed.
    return (message == '') || (message == ' ');
  },

  buildQueue: function(queue){
    return buildQueueGlobal(queue);
  },

  buildPrintedQueueEmbedObject: function(queue){
    return {
      type: 'rich',
      color: 1146534,
      thumbnail:{url:'http://i.imgur.com/JO4b5GH.jpg'},
      footer: {text:'Total: '+queue.length+' | Length: ' + convertSecondsToMinutesAndSeconds(getEtaGlobal(queue))},
      description: buildQueueGlobal(queue)
    }
  }

}

function generateLocalFileName(userID, videoID){
  // Generates a unique filename that won't be able to be overwritten because no two generated filenames are the same.
  return Date.now()+'_'+userID+'_'+videoID;
}

function buildQueueGlobal(queue){

  // Return empty list of the queue is empty.
  if (queue.length == 0) return "**No items in Queue.**";

  var output = "**Items in Queue**:\n";
  try {
    for (var i = 0; i < queue.length; i++){
      var queuePosition = i + 1;
      output += "\n" + queuePosition + ". " + queue[i].title + " **["+queue[i].username+"]**";
    }
  } catch(e){ log("Problem building queue: " + e)}

  return output;
}

function getEtaGlobal(queue){
  var output = "Unknown";
  var eta = 0;
  if(queue.length == 1) return eta;

  try {
    for (var i = 0; i < queue.length; i++){
      eta += queue[i].duration;
    }
    output = eta;
  } catch(e){ log("Calculating ETA: "+ e)}

  return output;
}

function convertSecondsToMinutesAndSeconds(seconds){
        var timeleft = seconds;
        try {
          var minutesCalc = Math.floor(seconds / 60);
          var secondsCALC = seconds - minutesCalc * 60;
          var minutesDISPLAY;
          var secondsDISPLAY;

          if (minutesCalc.toString().length === 1){
            minutesDISPLAY = '0' + minutesCalc.toString();
          } else {minutesDISPLAY = minutesCalc.toString()};

          if (secondsCALC.toString().length === 1){
            secondsDISPLAY = '0' + secondsCALC.toString();
          } else {
            secondsDISPLAY = secondsCALC.toString();
          }

          timeLeft = minutesDISPLAY + 'm ' + secondsDISPLAY + 's';
        } catch(e){ log("Couldn't convert: " + seconds + "s into minutes and seconds. " + e)}

        return timeLeft;
}


function log(message){
  console.log("[QUEUE] " + message);
}
