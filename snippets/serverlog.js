//PUBLIC SERVER LOGGING FUNCTION
//Takes event info and prints voice channel joins
//as well as leeaves, nickname changes, server
//joins and server leaves to the log channel.

function logging(bot){
//list current user information.

var config = require('../config.json');

var logChannels = {
  '128319520497598464': config.serverSpecific['128319520497598464'].publicLogChannel
}
var users = bot.servers['128319520497598464'].members;

var voiceChannelCache = bot.channels;

function updateCache(){
    return users = bot.servers['128319520497598464'].members;
}//I dont believe I need to update the cache. The current 'users' object retains an older cached version by the time the event fires and is read.

function log(message, channel){
  bot.sendMessage({
    to: channel,
    message: message
  }, function(err){
  })
};

function reportChange(user, comment, item, older, newer){
  if (older === 'null') older = 'N/A';
  if (newer === 'null') newer = 'N/A';
  var outputString = comment + "\n\n```Ruby\n" + 'Old '+item+':' + older + '\n' + 'New ' + item + ':' + "" + newer + "```";
  return outputString;
}

function grabUserProfile(userID, event){
  var info = event.d.user;
  var avatar = info.avatar !== null ? "https://cdn.discordapp.com/avatars/"+userID+"/"+info.avatar+".jpg" : '';
  var n = new Date();
  var joinDate = typeof event.d.joined_at !== 'undefined' ? '\nJoined at: '+event.d.joined_at.split('T')[0].split('-')[2] +'-'+ event.d.joined_at.split('T')[0].split('-')[1]+'-'+event.d.joined_at.split('T')[0].split('-')[0] + " " + event.d.joined_at.split('T')[1].split('.')[0] : '\nRemoved at: '+ n.getDate() + "-" + n.getMonth() + "-" + n.getFullYear() + " " + n.getHours() + ":" + n.getMinutes();
  //var outputString = ":raised_hand_with_part_between_middle_and_ring_fingers::skin-tone-1:  **"+info.username+"** has joined the server.\n\n";
  var playing = '';
  try {
    var playing = typeof bot.users[userID].game.name !== 'undefined' ? "\nPlaying: " + bot.users[userID].game.name : '';
  } catch(e){ console.log("Couldn't Fetch Playing Status for " + info.username + " at server join event."); };
  var outputString = "```Ruby\nBot: "+info.bot+"\nUser ID: "+userID+joinDate+playing+"```\n" + avatar;

  return outputString;
}




//event capturing.
bot.on('any', function(event){
    var outputString = null;
    switch (event.t) {
      case 'GUILD_MEMBER_UPDATE':
        //create user variable from the event.
        var severID = event.d.guild_id;
        var channel = logChannels[event.d.guild_id];
        var user = {
          id: event.d.user.id,
          name: event.d.user.username,
          nick: (event.d.nick === null) ? '<NONE>' : event.d.nick
        };
        var oldNick = users[user.id].nick === null ? '<NONE>' : users[user.id].nick;

        //check for nickname change.
        if (oldNick !==  user.nick){
          //the nickname has changed. Report to log.
          //outputString = ":writing_hand::skin-tone-1: **Aaron's** Nickname has been changed.\n\n`Old Nickname:` "+user.nick+"\n`New Nickname:` **"+users[user.id].nick+"**\n";
          //log(outputString, logChannels[event.d.guild_id]);
          log(reportChange(user.name, ":writing_hand::skin-tone-1: **"+user.name+"'s** Nickname has been changed.", "Nickname", oldNick, user.nick), channel);
          //console.log(reportChange(user.name, ":writing_hand::skin-tone-1: **"+user.name+"'s** Nickname has been changed.", "Nickname", users[user.id].nick, user.nick), channel);


        }
        break;//finish guild member update event.

      case 'GUILD_BAN_ADD':

        break;

      case 'GUILD_MEMBER_ADD':
        var info = event.d.user;
        log(":raised_hand_with_part_between_middle_and_ring_fingers::skin-tone-1:  **"+info.username+"** has joined the server.\n\n" + grabUserProfile(event.d.user.id, event), logChannels[event.d.guild_id])
        break;
      case 'GUILD_MEMBER_REMOVE':
        log(":wave::skin-tone-1: **" + event.d.user.username+"** has been removed from the server.\n\n" + grabUserProfile(event.d.user.id, event), logChannels[event.d.guild_id]);
        break;

      case 'VOICE_STATE_UPDATE':
        var info = event.d;
        var serverID = info.guild_id;
        var username = bot.users[info.user_id].username;
        //console.log(event);
        var channel = info.channel_id;
        var Nickname = users[info.user_id].nick !== null ? "("+users[info.user_id].nick+")" : '';
        var n = new Date();
        var time = "[" + (n.getHours().toString().length === 2 ? n.getHours() : '0' + n.getHours()) + ":" + (n.getMinutes().toString().length === 2 ? n.getMinutes() : '0' + n.getMinutes()) + "]";
        //console.log(voiceChannelCache[info.user_id]);

        if (channel !== null && typeof voiceChannelCache[channel].members[info.user_id] === 'undefined'){
          var channelName = bot.channels[channel].name;
          //user has joined a voice channel.

          log(time + " :speaking_head: **" + username + "** "+Nickname+" has joined `"+channelName+"` voice channel.", logChannels[serverID]);
        } else if (channel == null){
          log(time + " :speaking_head: **" + username + "** "+Nickname+" has left voice.", logChannels[serverID]);
        }
        break;

      case 'CHANNEL_CREATE':
        var info = event.d;
        var serverID = info.guild_id;
        var isPrivate = info.is_private;
        var name = info.name;
        var type = info.type;


        if (!isPrivate){
          //anounce a new channel has been made.

        }
        break;
      default:

    }

});


}

module.exports = logging;
