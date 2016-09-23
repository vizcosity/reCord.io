function imgurAPI(cID, cSecret){
  //find random number from an interval function.
  function randomIntFromInterval(min, max){
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  var request = require('request');
  if (typeof cID === 'undefined' || typeof cSecret === 'undefined'){
    //setting both cleint ID & client secret to default values.
    cID = 'd456ec71871c9ae';
    cSecret = '3b32fa5ef2965975a5c8cdedf7a1cfde8b81c013';
  }

  this.search = function(query, item, callback){
    //Takes a search query, and the item index of the returned array,
    //and passed it into the callback once fetched.
    if (item < 0){
      item = 0;
      console.log('Item value too low. Selected lowest (0) default instead.');
    }
    try {
      var querystring = require('querystring');
    } catch(e){ console.log('Failed to load querystring. Do npm install querystring.'); return;}
    var page = 0;

    if (typeof query === 'undefiend') return console.log('No text inputted for imgur api query search.');

    var q = query;
    var requestOpts = {
      url: 'https://api.imgur.com/3/gallery/search/top/'+page+'/?'+querystring.stringify({q}),
      //url: 'https://api.imgur.com/3/gallery/random/random/' + page,
      headers: {
        "Authorization": 'Client-ID ' + cID
      }
    }

    request(requestOpts, function(error, response, body){
      try {
        body = JSON.parse(body);

        if (item === 'random'){
            item = randomIntFromInterval(0,body.data.length);
            //console.log(item);
        }

        if (item !== 0 && item > body.data.length - 1){
          console.log('Item value too high. Default last item selected');
          item = body.data.length - 1;
        }
        callback(body.data[item]);
      } catch(e){ log('Error processing imgur fetch/request (search): ' + e)}
    })
  }

  this.random = function(callback){

    var page = 0;
    var requestOpts = {
      //url: 'https://api.imgur.com/3/gallery/search/top/'+page+'/?'+querystring.stringify({q}),
      url: 'https://api.imgur.com/3/gallery/random/random/' + page,
      headers: {
        "Authorization": 'Client-ID ' + cID
      }
    }

    request(requestOpts, function (error, response, body){
      try {
      body = JSON.parse(body);
      //console.log(body);
      var item = randomIntFromInterval(0,body.data.length-1);

      //filter nsfw.
      for (var i = item; i < body.data.length; i++){
        if (!body.data[i].nsfw){
          body.data[0] = body.data[i];
          break;
        }
      }

      callback(body.data[0]);
      //passes first item into the callback.
    } catch(e){ log('Error processing imgur fetch/request (random): ' + e)}
    })

  }

}

module.exports = imgurAPI;

/*
var x = require('./snippets/imgurAPI.js');
var imgur = new x();
*/
