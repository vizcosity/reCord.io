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

  buildQueuedPlaylistNotificationEmbedObject: function(playlist, eta){
    return {
      type: 'rich',
      color: 1146534,
      thumbnail:{url:'http://i.imgur.com/JO4b5GH.jpg'},
      footer: {text:'Requested By '+playlist.requester+' | ETA: '+convertSecondsToMinutesAndSeconds(eta)},
      description: '**Queueing Playlist**: ' + playlist.title + "\n**Source**: " + "http://youtube.com/playlist?list="+playlist.playlistID
    }
  },

  shuffleQueue: function(queue){
    // log("Shuffling queue.");
    var shuffledQueue = [];
    while (shuffledQueue.length !== queue.length){
      var randomItem = queue[Math.floor(Math.random()*queue.length)];
      // log("SHUFFLE: Random item: "+queue.indexOf(randomItem));
      if (!itemInArray(randomItem, shuffledQueue)) {
        // log("Placing item " + queue.indexOf(randomItem) + " at position " + shuffledQueue.length);
        shuffledQueue.push(randomItem);
      }
    }
    // console.log(shuffledQueue);
    return shuffledQueue;
  },

  clearQueueHandler: function(cmd, queue, callback){
    try {
      if (!callback) return log("clearQueueHandler: no callback found.");
      if (!cmd) return log("clearQueueHandler: no cmd object found.");
      if (!queue) return log("clearQueueHandler: No queue found to clear.");
      var mode = determineClearQueueMode(cmd.arg, cmd.event);
      if (!mode) return callback(queue, "Invalid format. "+cmd.prefix+"clear subcommand has 4 modes:\n\n**"+cmd.prefix+"q "+cmd.prefix+"clear** (Removes entire queue)\n**"+cmd.prefix+"q "+cmd.prefix+"clear 2** (Clear's position 2 from queue)\n**"+cmd.prefix+"q "+cmd.prefix+"clear @User @User2** (Clears everything requested by mentioned users)\n**"+cmd.prefix+"q "+cmd.prefix+"clear 'sandstorm'** (Removes all items containing sandstorm. Must have quotes!)");
      if (!cmd.permissions.hasSubScope(cmd.uID, "queue", "clear", mode).result)
        return callback(queue, "Insufficient permissions to use this subcommand: "+cmd.permissions.hasSubScope(cmd.uID, "queue", "clear", mode).reason);

      /*  There are 4 modes for clearQueue:
          * Clear all from a user. (self or other)
          * Clear by keyword (using quote marks "")
          * Clear by position
          * Clear all. (No arguments);
      */

      // Generates formatted string of removed queue items based on array passed as an argument.
      function generateRemovedListString(removedItems){
        var output = "";

        for (var i = 0; i < removedItems.length; i++){
          if (output.length >= 1800) {
            output += "\n...\n**Plus "+(removedItems.length-i)+" more items.**";
            break;
          }
          output += "\n• " + removedItems[i].title;
        }

        return output;
      }

      // Returns the difference between the original array, and the changed array.
      function getDifferentElements(array1, array2){
        var output = [];
        for (var i = 0; i < array1.length; i++){
          // If the current array1 element does not exist in array2, it must have been removed.
          if (array2.indexOf(array1[i]) == -1 ) output.push(array1[i]);
        }
        return output;
      }

      switch (mode){
          case "all":
            callback([], null, "All items in queue cleared. **["+queue.length+"]**"); // Return an empty queue.
            break;
          case "keyword":
            var initialQueueLength = queue.length;
            var removedItems = []; // This is to report to the user which items have been removed.
            var rawKeyword = cmd.arg.substring(1,cmd.arg.length-1).toLowerCase();
            for (var i = 0; i < queue.length; i++){
              if (queue[i].title.toLowerCase().indexOf(rawKeyword) !== -1)
                removedItems.push(queue.splice(i, 1)[0]);
            }

            // Formatting the items that have been removed.
            var removedItemsString = generateRemovedListString(removedItems);

            var finalQueueLength = initialQueueLength - queue.length;
            callback(queue, null, "Removed items containing: " + rawKeyword + " **["+finalQueueLength+"]**:"+removedItemsString);
            break;
          case "position":
            var position = parseInt(cmd.arg);
            var index = position - 1;
            if (queue.indexOf(index) !== -1) return callback(queue, "Invalid queue position: " + position);
            var songTitle = queue[index].title;
            queue.splice(index, 1);
            return callback(queue, null, position+". "+songTitle+" removed from queue. **[1]**");
            break;
          case "user-self":
            var initialQueueLength = queue.length;
            var initialQueue = queue;

            queue = queue.filter(containsUserID); // Filtered queue.

            var removedItems = getDifferentElements(initialQueue, queue);
            var removedItemsString = generateRemovedListString(removedItems);

            function containsUserID(arrayItem){
              return !(arrayItem.userID == cmd.uID);
            }

            var finalQueueLength = initialQueueLength - queue.length;
            return callback(queue, null, "Removed all items requested by: " + cmd.user + " **["+finalQueueLength+"]**:"+removedItemsString);
            break;
          case "user-other":
            var initialQueueLength = queue.length;
            var initialQueue = queue;
            var users = [];

            for (var i = 0; i < cmd.event.d.mentions.length; i++){
              users.push(cmd.event.d.mentions[i].id);
            }

            queue = queue.filter(containsUserIDs);

            var removedItems = getDifferentElements(initialQueue, queue);
            var removedItemsString = generateRemovedListString(removedItems);

            function containsUserIDs(arrayItem){
              var idToCompare = arrayItem.userID;
              for (var i = 0; i < users.length; i++)
                if (users[i] == idToCompare) return false;
              return true;
            }

            var formatUsernames = "";
            for (var i = 0; i < cmd.event.d.mentions.length; i++){
              formatUsernames += (i !== cmd.event.d.mentions.length -1 ) ? (cmd.event.d.mentions[i].username + ', ') : cmd.event.d.mentions[i].username;
            }

            var finalQueueLength = initialQueueLength - queue.length;
            callback(queue, null, "Removed all queue items requested by: "+formatUsernames+" **["+finalQueueLength+"]**:"+removedItemsString);
            break;
          default:
            callback(queue, "Could not parse request: " + cmd.arg);
            return log("ClearQueueMode not recognizd: " + determineClearQueueMode(cmd.arg));
      } // End of switch.
    } catch(e) { log("clearQueueHandler: " + e)}
  },

  renameItemHandler: function(arg, queue, callback){
    if (!callback) return log("No callback found for renameItemHandler.");

    var queuePosition = parseInt(arg.split(' ')[0]) - 1;

    var newName = arg.substring(queuePosition.toString().length+1, arg.length);

    if (!queue[queuePosition] || !queue[queuePosition].title) return callback(null, "Invalid Queue position selected: "+(queuePosition+1));

    var oldName = "";

    try {
      oldName = queue[queuePosition].title;
      queue[queuePosition].title = newName;
    } catch(e){log("Renaming queue item: " + e)}

    callback(queue, null, "**Queue Item ["+(queuePosition+1)+"] Renamed.**\n**Old**: "+oldName+"\n**New**: "+newName);

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
  // return Date.now()+'_'+userID+'_'+videoID;
  return videoID; // Experimental agnostic version
}

function itemInArray(item, array){
  try {
    for (var i = 0; i < array.length; i++){
      if (item == array[i]) return true;
    }
    return false;
  } catch(e){log("Checking if in array: " + e)}
}

function determineClearQueueMode(arg, event){
  try {
    if (!arg) return "all";

    if (!isNaN(parseInt(arg))) return "position";

    if ((arg.substring(0,1) == "'" && arg.substring(arg.length-1, arg.length) == "'") || (arg.substring(0,1) == '"' && arg.substring(arg.length-1, arg.length) == '"'))
      return "keyword";


    if (event && event.d && event.d.mentions.length >= 1){
      // This is a user clear request.

      for (var i = 0; i < event.d.mentions.length; i++){
        console.log(event.d.mentions[i].id+": " + event.d.author.id);
        if (event.d.mentions[i].id !== event.d.author.id) return "user-other";
      }

      if (event.d.mentions[0].id == event.d.author.id) return "user-self";
    }

  } catch(e){log("determineClearQueueMode: " + e)}

}

function buildQueueGlobal(queue){
  try {
    // Return empty list of the queue is empty.
    if (queue.length == 0) return "**No items in Queue.**";

    var output = "**Items in Queue**:\n";
    try {
      for (var i = 0; i < queue.length; i++){
        var queuePosition = i + 1;
        if (output.length >= 1800) {
          output += "\n...\n**Plus "+(queue.length-i)+" more items.**";
          break;
        }
        output += "\n" + queuePosition + ". " + queue[i].title + " **["+queue[i].username+"]**"+(queue[i].type == 'playlist' ? " `[Playlist]`" : "");
      }
    } catch(e){ log("Problem building queue: " + e)}

    return output;
  } catch(e){log("Building queue: " + e)}
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
