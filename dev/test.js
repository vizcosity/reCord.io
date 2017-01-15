var Discord = require('discord.io');
var fs = require('fs');
__parentDir = require('path').dirname(process.mainModule.filename);
require('epipebomb')();

var client = new Discord.Client({
    autorun: true,
    token: "MjUxMDEyNzk1ODgwMDQ2NTky.CxdNaA.GEzYCnNw-PaptCAl1To9D6bO_aY"
});

var VCID = "128319522443624448";
var song = "./audio/okay.wav";

client.on('ready', function() {
    console.log("%s (%s)", client.username, client.id);

    client.joinVoiceChannel(VCID, function(err, events) {
        if (err) return console.error(err);
        events.on('speaking', function(userID, SSRC, speakingBool) {
            console.log("%s is " + (speakingBool ? "now speaking" : "done speaking"), userID );
        });

        client.getAudioContext(VCID, function(err, stream) {
            if (err) return console.error(err);
            fs.createReadStream(song).pipe(stream, {end: false});
            stream.on('done', function() {
                fs.createReadStream(song).pipe(stream, {end: false});
            });
        });
    });
});
