// Takes in youtube requests, handles them accordingly.
var youtubeItemQuery = require('./youtubeItem.js');
var youtubeSearch = require('./youtubeSearch.js');
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

    // Strictly takes in youtube links.
    youtubeItemQuery(query, function(data){
      //data.result = true;
      data.videoID = query;
      callback(data);
    });

  } catch(e) {log(e)};

}

function parseInput(input){
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
