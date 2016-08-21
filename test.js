var Discord = require('discord.io');
var http = require('http');
var b64encode = require('base64-stream').Encode;
var webPLayer = require('./Player.js');

var fs = require('fs');

var config = require('./config.json');
var help = require('./help.json');
var YouTube = require('youtube-node');
var Player = require('./Player.js');

var prefix = config.prefix;

var bot = new Discord.Client({
  token: "MjA1MzkxMTI2MjkzNzc0MzM2.CpJbog.TH8o86o4pIoHghC6_U2H3xQwJKg",
  autorun: true
});


var voiceChannelID = '128319522443624448';
var Play = new Player(bot, 'AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU', '2de63110145fafa73408e5d32d8bb195', voiceChannelID);
bot.on('ready', function() {
    console.log(bot.username + " - (" + bot.id + ")");


    var youTube = new YouTube();

    youTube.setKey('AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU');

    youTube.getById('HcwTxRuq-uk', function(error, result) {
      if (error) {
        console.log(error);
      }
      else {
        console.log(result.items[0].snippet.title);
      }
    });



});

bot.on('message', function(user, userID, channelID, message, event){
  if (message === '!audio'){
  	bot.joinVoiceChannel(voiceChannelID, function() {
  		bot.getAudioContext({channel: voiceChannelID, stereo: true}, function(error, stream){

        stream.playAudioFile('sample.mp3');

      });
  	});}
    Play.setAnnouncementChannel('151051305295675395');
    Play.enqueue(user, userID, 'https://www.youtube.com/watch?v=91DSNL1BEeY');

})
