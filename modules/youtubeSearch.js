// Takes in youtube URL's and resolves them to output the playable URL, title, and duration.

// Dependencies
var ytdl = require('ytdl-core');
var request = require('request');
var YouTubeNode = require('youtube-node');
var YouTube = new YouTubeNode(); // Require other youtube API for better search.
YouTube.setKey('AIzaSyAb1wRVss0Pf4nM9Ra3bCgGgRYSplblusQ');

// APIs
var YTKey = 'AIzaSyAb1wRVss0Pf4nM9Ra3bCgGgRYSplblusQ';
var API = {
  Youtube: {
    Snippet: function(id) {
      return "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + id + "&key=" + YTKey;
    },
    ContentDetails: function(id) {
      return "https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=" + id + "&key=" + YTKey;
    },
    GetPlaylist: function(id) {
      return "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=" + id + "&key=" + YTKey;
    },
    PlaylistInfo: function(id){
      return "https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=" + id + "&key=" + YTKey;
    },
    Search: function(q) {
      return "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + q + "&key=" + YTKey;
    }
  },
  SoundCloud: {
    CheckLink: function(link) {
      return "http://api.soundcloud.com/resolve?url=" + link
    }
  }
}

function youtube(query, callback){

  try {

    var self = this;
    if (!callback) return log("No callback found.");

    YouTube.search(query, 5, function(error, results){

      if (error) {
        log("Search request failed. " + error);
        return callback({result: false, reason: "Error searching for query `"+query+"`\n\nReason: " + error});
        //return msg.error("Error searching for query `"+query+"`\n\nReason: " + error)
      }

      if (!results) {
        log("No results found for query: " + query);
        return callback({result: false, reason: "Search request failed."});
        // return msg.error("No results found.");
      }

      var result = null;
      // Assumes at this point that there are results.
      for (var i = 0; i < results.items.length; i++){
        if (results.items[i].id.kind === 'youtube#video'){
          result = results.items[i];
          break;
        }
      };

      if (!result) {
        log("No results found for query: " + query);
        return callback({result: false, reason: "No results found."});
        // return msg.error("No results found.");
      }

      try {
        var title = ":small_blue_diamond: **Title**: " + result.snippet.title + "\n\n";
        var desc = ":pencil: **Description**: "+result.snippet.description+"\n";
        var url = "https://youtube.com/watch?v=" + result.id.videoId;

        // Concatenate output.
        var output = title + desc + url;

        callback({result: result.id.videoId, formattedMessage: output});

      } catch(e){ console.log(e); };
    }); // End of search query.

  } catch(e){log(e)}
}

function log(message){
  console.log("[YOUTUBE SEARCH] " + message);
}


module.exports = youtube;
