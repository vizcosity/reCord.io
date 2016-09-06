/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
var spotifyAPI = function(client_id, client_secret, redirect_uri){
try {
var playlistFunction;
var tracksFunction;

this.getPlaylists = function(spotifyUserID, callback){
  playlistFunction(spotifyUserID, callback);
}

this.getTracks = function(spotifyUserID, playlistID, callback){
  tracksFunction(spotifyUserID, playlistID, callback);
}

this.getUserInfo = function(callback){
  userIDFunction(callback);
}

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

//var client_id = '31e6e9b77b9747f0b9d56e7a7f94e075'; // Your client id
//var client_secret = 'edf8f3013a3e430f9505f6f7e47677d3'; // Your secret
//var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var self = this;

var stateKey = 'spotify_auth_state';

var app = express();

var collectedPlaylists = false;
var server;

var output = {

};
var running = false; //to check if the server is running before closing in the this.stop() method.
self.start = function(startCallback){
    server = app.listen(8888);
    running = true;
    console.log('Spotify web interface authenticator running.');


app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    //console.log(state);
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;



        //var playlists;
        // use the access token to access the Spotify Web API
        userIDFunction = function(callback){
          var options = {
            url: "https://api.spotify.com/v1/me",
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };

          request.get(options, function(error, response, body){
            callback(body, error);
          })
        }

        playlistFunction = function(spotifyUserID, callback){
          //var spotifyUserID = '1132352243';
          console.log('collect playlist called');
          var options = {
            url: 'https://api.spotify.com/v1/users/' + spotifyUserID + '/playlists?limit=50',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };

          if (state !== null){//response has been recieved.
          request.get(options, function(error, response, body) {

            if (error){
              output.error.playlists = error;
            } else {
              collectedPlaylists = true;
            }

            output.playlists = body;
            callback(output.playlists, error); //outputs to callback function once completed.
          });
          }
        }

        tracksFunction = function(spotifyUserID, playlistID, callback){
          console.log('collect tracks called');
          if (collectedPlaylists){

            var options2 = {//https://api.spotify.com/v1/users/1132352243/playlists/4ILvlMSur4HylOb37Ub2EC/tracks?market=ES
              //url: 'https://api.spotify.com/v1/users/'+spotifyUserID+'/playlists/'+playlists[2].id+'/tracks?market=ES',
              url: 'https://api.spotify.com/v1/users/'+spotifyUserID+'/playlists/'+playlistID+'/tracks',
              headers: { 'Authorization': 'Bearer ' + access_token },
              json: true
            };
            //options are defined, they are then entered as a paramater into the request.get method to grab the tracks from the playlist.
            request.get(options2, function(error, response, body){
              if (error){
                output.error.tracks = error;
              }
              output.tracks = body;
              callback(output.tracks, error); //outputs tracks to the callback input as a paramater to the parent function.
            });

          } else {
            callback(null, 'Playlist has not been gathered from user.');
          }
        }

            startCallback();
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });



  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

//console.log('Listening on 8888');


} //start the web server.

  self.stop = function(){
    server.close();
  }// stop the web server.
} catch(e){ console.log(e); };
}


module.exports = spotifyAPI;
