//A list of useful accessible functions for bot messaging.

function messenger(bot, channel){
  //if channelID has not been passed, set to null.
  var channelID = typeof channel !== 'undefined' ? channel : null;

  var self = this;

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

  this.embed = function(embedObj, timeout){
    if (check()) return;
    bot.sendMessage({
      to: channelID,
      message: '',
      embed: embedObj
    }, function(err, res){
      if (err) log(err);
      if (timeout) {
        setTimeout(function(){
          try {
            bot.deleteMessage({
              channelID: res.channel_id,
              messageID: res.id
            });
          } catch(e){log(e);};
        }, timeout);
      }
    });
  }

  this.error = function(message, timeout){
    if (!timeout) timeout = 30000;
    if (check()) return;
    self.embed({
      type: "rich",
      title: "Error",
      description: message,
      color: "16729871",
      author: {
        name: "Error",
        icon_url: "http://www.copypastesymbol.com/wp-content/uploads/2016/07/1f6ab.png"
      }
    }, timeout);
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
