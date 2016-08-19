var Discord = require('discord.io');
var http = require('http');
var b64encode = require('base64-stream').Encode;

var fs = require('fs');

var config = require('./config.json');
var help = require('./help.json');

var prefix = config.prefix;

var bot = new Discord.Client({
  token: "MjA1MzkxMTI2MjkzNzc0MzM2.CpJbog.TH8o86o4pIoHghC6_U2H3xQwJKg",
  autorun: true
});


var voiceChannelID = '128319522443624448';

bot.on('ready', function() {
    console.log(bot.username + " - (" + bot.id + ")");





});

bot.on('message', function(user, userID, channelID, message, event){
  if (message === '!audio'){
  	bot.joinVoiceChannel(voiceChannelID, function() {
  		bot.getAudioContext({channel: voiceChannelID, stereo: true}, function(error, stream){

        stream.playAudioFile('sample.mp3');

      });
  	});}
})
