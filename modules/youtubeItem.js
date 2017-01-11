// Takes in youtube URL's and resolves them to output the playable URL, title, and duration.

// Dependencies
var ytdl = require('ytdl-core');
var request = require('request');
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

function youtube(id, callback){

  var self = this;
  var title = "Untitled";
  var duration = 0;
  var url;
  var fetchedDetails = 0;
  var data = {};
  var timeout = 0;

  this.resolveAudio = function(callback){

    ytdl.getInfo('https://www.youtube.com/watch?v='+id, function(err, body){
      try {
        // console.log(body);
        var formats = body.formats;
        var hb = 0; // Highest Bitrate
        var item = null;

        // Prioritize finding an isolated audiostream, otherwise use the video itself.
        for (var i=0; i < formats.length; i++) {
          if ((formats[i].type && formats[i].type.substring(0,'audio'.length)=='audio') && (Number(formats[i].audioBitrate)) && Number(formats[i].audioBitrate) > hb ) {
            hb = Number(formats[i].audioBitrate);
            item = formats[i];
          }
        }

        // If it can't find an isolated audio stream, use the videostream instead as a fallback.
        if (!item) {
          for (var i=0; i < formats.length; i++) {
            if ( (Number(formats[i].audioBitrate)) && Number(formats[i].audioBitrate) > hb ) {
              hb = Number(formats[i].audioBitrate);
              item = formats[i];
            }
          }
        }
      } catch(e){log("Could not resolve audio for " + id + " "+e)}
      if (!callback) return log("No callback for resolveAudio found.");

      if (!item || !item.url){
        log("No URL found to resolve audio.");
        return callback(false);
      }
      // console.log(item);
      callback(item.url);

    })
  }

  this.getTitle = function(callback){
    request( API.Youtube.Snippet(id) , function(err, res, body) {
      if (err) return log('error', err);
      body = JSON.parse(body);
      var title = "Untitled";

      try {
        title = body.items[0].snippet.title;
      } catch(e){ log("Error assigning title: " + e)}

      if (!callback) return log("No callback found for getTitle.");

      callback(title);
    });
  }

  this.getDuration = function(callback){

    request (API.Youtube.ContentDetails(id), function(err, res, body) {
      if (err) return log('error', err);
      body = JSON.parse(body);
      var rawDuration = 0;
      //console.log(body.items[0].contentDetails);

      // Error checking.
      try {
        if (!body || !body.items || !(body.items.length !== 0)){
          return log("Duration (Content Details): no items found.");
        }
      } catch(e){
        log("Collecting (Duration) ContentDetails: "+e);
      }

      try {
        rawDuration = body.items[0].contentDetails.duration;
      } catch(e){log("Could not get video duration for: "+id)}

      if (!callback) return log("No callback for getDuration found.");

      callback(convertDurationToSeconds(rawDuration));

    });
  }





  this.getTitle(function(title){
    data.title = title;
    //console.log(title);
    //if (!title) return callback({result: false, reason: "Could not get title."});

    self.getDuration(function(duration){
      //console.log(duration);
      data.duration = duration;

      //if (!duration) return callback({result: false, reason: "Could not get duration."});
    });

    self.resolveAudio(function(url){
      data.url = url;

      // Only a vailed url request breaks the request as it is a vital component.
      if (!url) return callback({result: false, reason: "Could not resolve video URL. Did you enter a valid link?"});

      // If program reaches this point can be assumed request was successful.
      data.result = true;
      callback(data);
    });
  });


  if (!callback) return log("No callback found for YouTube Item snippet / module.");




}

function log(message){
  console.log("[YOUTUBE ITEM] " + message);
}


function convertDurationToSeconds(input) {
  var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
  var hours = 0, minutes = 0, seconds = 0, totalseconds;
  if (reptms.test(input)) {
    var matches = reptms.exec(input);
    if (matches[1]) hours = Number(matches[1]);
    if (matches[2]) minutes = Number(matches[2]);
    if (matches[3]) seconds = Number(matches[3]);
    totalseconds = hours * 3600  + minutes * 60 + seconds;
  }
  return (totalseconds);
}

module.exports = youtube;
