//A list of useful accessible functions for bot messaging.

function messenger(bot, channel){
  //if channelID has not been passed, set to null.
  var channelID = typeof channel !== 'undefined' ? channel : null;

  //set the channelID in which responses should be made.
  this.setCID = function(cID){
    channelID = cID;
  }

  //self-deleting response in the channelID where the bot was invoked.
  this.notify = function(msg, delay, callback){
    try {
      //stop if no channelID has been selected.
      if (check()) return;

      if (typeof delay === 'undefined') delay =10000; //defaults to 10 seconds of notification before messsage self-destructs.
      bot.sendMessage({
        to: channelID,
        message: msg
      }, function callback(err, response){
        try {
          var previousMessageID =  response.id;
          if (callback) callback();
          setTimeout(function(){
            try {
              bot.deleteMessage({
                channelID: response.channel_id,
                messageID: previousMessageID
              });
            } catch(e){log(e);};
          }, delay);
        } catch(e){log(e);};
      });
    } catch (e) {log(e);};
  }

  //replies to the channel in which the bot was invoked.
  this.send = function(msg, typing, callback){
    if(check()) return;

    bot.sendMessage({
      to: channelID,
      message: msg,
      typing: typing ? true : false
    }, function(err, resp){
      if (err !== null) log(err);
      if (callback) callback();
    });

  }

  //logging function which shows that it has come from this file.
  function log(content){
    console.log('[MESSENGER] ' + content);
  }

  function check(){
    if (channelID === null){
      log('No channelID has been set.');
      return true;
    } else {
      return false;
    }
  }
}

module.exports = messenger;
