function voiceCheck(bot, channelID){
  try {
    var voiceChannels = bot._vChannels;
    var serverID = bot.channels[channelID].guild_id;

    if (typeof voiceChannels[channelID] !== 'undefined'){
      //voice channel connected.
      return true;
    } else {
      //no voice channel.
      return false;
    }
  } catch(e){ log(e); };

  function log(x){
    console.log('[VOICE CHECK] ' + x);
  }
}
module.exports = voiceCheck;
