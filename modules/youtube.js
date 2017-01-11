// Takes in youtube requests, handles them accordingly.
var youtubeItemQuery = require('./youtubeItem.js');
var youtubeSearch = require('./youtubeSearch.js');
var youtubePlaylist = require('./youtubePlaylist.js');
function youtube(query, callback){

  try {

    if (!callback) return log("No callback found.");

    log("Recieved: " + query + "link: " + isLink(query));

    if (!isLink(query)){
      log("Not a link. Searching for query: " + query);
      return youtubeSearch(query, function(data){
        if (!data.result) return callback(data);
        // Run the query on the specified video ID.
        youtubeItemQuery(data.result, function(itemData){
          // itemData.result = true;
          itemData.videoID = data.result;
          callback(itemData);
        });
      });
    }

    query = parseInput(query); // Formats link so that it only has the videoID.
    if (!query) callback({result: false, reason: "Invalid Link. Must be a YouTube URL."});

    if (query.type == "video"){
      // log("Queueing: " + query.id);
      youtubeItemQuery(query.id, function(data){
        data.videoID = query.id;
        callback(data);
      });
    }
    if (query.type == "playlist"){
      // log("Queueing: "+query.id);
      youtubePlaylist(query.id, function(data){
          callback(data);
      });
    }

  } catch(e) {log(e)};

}

function parseInput(input){
  // Assumes that input has already been validated.
  // Takes in a link and checks to see if it is valid video or playlist url.
  if (input.indexOf('youtube') != -1){
    // Standard long link format.

    if (input.indexOf('list') != -1)
      // Is a playlist.
      return {
        id: input.split('list=')[1],
        type: "playlist"
      }


    return {
      id: input.split('?v=')[1],
      type: "video"
    };
  }

  if (input.indexOf('youtu.be') != -1){

    // Shortform link.

    // Checking if a shortform playlist.
    if (input.indexOf('list') != -1)
      // Is a playlist.
      return {
        id: input.split('list=')[1],
        type: "playlist"
      }

    return {
      id: input.split('youtu.be/')[1],
      type: "video"
    };
  }

  return log("Could not parse input from link: " + input);
}

function validateInput(input){
  // If input is a link, check it is from YouTube specifically.

}

function isLink(query){
  // console.log("ISLINK: |"+query+"|");
  return (query.split(':')[0] == 'http') || (query.split(':')[0] == 'https');
}

function log(message){
  console.log("[YOUTUBE MODULE] "+message);
}

module.exports = youtube;
