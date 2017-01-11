// Takes in youtube URL's and resolves playlist information.

// Dependencies
// var ytdl = require('ytdl-core');
var request = require('request');
var youtubeItem = require('./youtubeItem');
// var childProc = require('child_process');
// var YouTubeNode = require('youtube-node');
// var YouTube = new YouTube(); // Require other youtube API for better search.
// YouTube.setKey('AIzaSyAb1wRVss0Pf4nM9Ra3bCgGgRYSplblusQ');

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
    GetNextPlaylistPage: function(id, pageToken){
      return "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=" + id + "&pageToken=" + pageToken + "&key=" + YTKey;
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

function youtubePlaylist(queryID, callback){
  if (!callback) return log("No callback found.");
  var collectedIDs = []; // An array of video id's that will be passed onto the youtubeItem module to be processed.
  request(API.Youtube.GetPlaylist(queryID), function(err, res, body){
    body = JSON.parse(body);
    var nextPageToken = null;

    // Assigning the next page token.
    if (body.nextPageToken) nextPageToken = body.nextPageToken;

    if (err) return callback({result: false, reason: err});
    if (!body || !body.items || body.items.length == 0) {
      // console.log(body);
      return callback({result: false, reason: "No results found. Are you sure this was a valid playlist URL?"});
    }

    var items = body.items;

    for (var i = 0; i < items.length; i++){
      var ci = items[i];
      if (ci.snippet && ci.snippet.resourceId && ci.snippet.resourceId.kind == 'youtube#video' && ci.snippet.resourceId.videoId){
        collectedIDs.push(ci.snippet.resourceId.videoId);
      }
    }

    function collectVideoIDsFromNextPage(nextPageToken, callback) {
      if (!nextPageToken) {log("Finished collecting videoIDs for playlist."); return callback();}

      request(API.Youtube.GetNextPlaylistPage(queryID, nextPageToken), function(err, res, body){
        body = JSON.parse(body);
        var nextPageToken = null;

        // Assigning the next page token.
        if (body.nextPageToken) nextPageToken = body.nextPageToken;

        if (err) return callback({result: false, reason: err});
        if (!body || !body.items || body.items.length == 0) {
          // console.log(body);
          return callback({result: false, reason: "No results found. Are you sure this was a valid playlist URL?"});
        }

        var items = body.items;

        for (var i = 0; i < items.length; i++){
          var ci = items[i];
          if (ci.snippet && ci.snippet.resourceId && ci.snippet.resourceId.kind == 'youtube#video' && ci.snippet.resourceId.videoId){
            collectedIDs.push(ci.snippet.resourceId.videoId);
          }
        }

        // When done, call again for the next page.
        collectVideoIDsFromNextPage(nextPageToken, callback);
      });
    }

    collectVideoIDsFromNextPage(nextPageToken, function(){

      // This is the callback for the end of videoID collection from pagination.
      // once all the pages have been visited, it runs this to get the final details for the playlist.

      // Getting the playlistName
      request(API.Youtube.PlaylistInfo(queryID), function(err, res, body){
        var playlistName = "Playlist";
        var playlistDesc = "Could not fetch description";
        var playlistThumbnail = "http://i.imgur.com/Q9bMuSa.png"; // Default funny thumbnail.
        if (err) log("Getting playlistName info: " + err);
        body = JSON.parse(body);

        if (body && body.items && body.items[0] && body.items[0].snippet && body.items[0].snippet.title){
          playlistName = body.items[0].snippet.title;
          if (body.items[0].snippet.description)
            playlistDesc = body.items[0].snippet.description;

          if (body.items[0].snippet.thumbnails && body.items[0].snippet.thumbnails.maxres)
            playlistThumbnail = body.items[0].snippet.thumbnails.maxres.url;

        }

        // Collect all attributes and callback.
        callback({
          result: true,
          name: playlistName,
          title: playlistName,
          desc: playlistDesc,
          playlistID: queryID,
          thumbnail: playlistThumbnail,
          videoIDs: collectedIDs
        });

      });

    });


  })

}

function log(message){
  console.log("[YOUTUBEPLAYLIST.js] "+message);
}

module.exports = youtubePlaylist;
