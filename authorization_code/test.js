var spotifyWeb = require('./app.js');

var spotGrab = new spotifyWeb('ecd271b45f9048ac88a217eaaed2f7f0', '206e720ec6314ed3b96c139d6205720c', 'http://54.172.184.70:8888/callback');

spotGrab.start(function(){

  spotGrab.getUserInfo(function callback(data){
    var userID = data.id;
    console.log('Succesfully grabbed user Info for ' + userID + ': ' + data.display_name);

    spotGrab.getPlaylists(userID, function(playlistData, error){
      var playlistInfo = new Array();
      if (error !== null) console.log(error);

      var playlists = playlistData.items;
      var outputPlaylistString = 'Available playlists : \n\n';
      for (var i = 0; i < playlists.length; i++){
        if (playlists[i].owner.id !== 'spotify'){
          playlistInfo.push({
            "name": playlists[i].name,
            "id": playlists[i].id,
            "playlistOwner": playlists[i].owner.id,
            "playlistURL": playlists[i].tracks.href
          });
          outputPlaylistString += playlists[i].name + '\n';
        }
      }
      console.log(outputPlaylistString);
      (function(){
        spotGrab.getTracks(userID, playlistInfo[0].id, function(trackData, error){
          if (error !== null) console.log(error);

          var stringedOutputTracklist = 'Tracks inside ' + playlistInfo[0].name + ': \n\n';

          for (var i = 0; i < trackData.items.length; i++){
            if (i < trackData.items.length - 1){
              //string normally with break
              stringedOutputTracklist += trackData.items[i].track.artists[0].name + ' - ' + trackData.items[i].track.name + '\n';
            } else {
              stringedOutputTracklist += trackData.items[i].track.artists[0].name + ' - ' + trackData.items[i].track.name;
            }
            //console.log(trackData.items[i].track.name);
          }
          console.log(stringedOutputTracklist);
        });
      })();
    });



  });
});
