function talkBack(bot){
  var self = this;
  var cleverbotAPI = require('cleverbot.io');
  var cleverbotConfig = require('./bottalk.json'); //local configuration file.
  var cleverbot = new cleverbotAPI(cleverbotConfig.apiUser, cleverbotConfig.apiKey);
  var messenger = require('./message.js');
  var msg = new messenger(bot);

  log('Loaded talkback');
  this.ask = function(message, channelID){
    log('recieved ' + message);

    cleverbot.create(function(err, session){
      if (typeof cleverbot.sessionName === 'undefined'){
        cleverbot.sessionName = session;
      } else {
        cleverbot.setNick(cleverbot.sessionName);
      }

      log('Session name: ' + session);
      if (err !== null) log (err);

      //ask cleverbot and push response to channel.
        msg.setCID(channelID);
        cleverbot.ask(message, function(err, response){
          if (err !== null) log(err);
          log(response);
          if (typeof response !== 'undefined' || response !== null){
            msg.send(response);
          }
        })
    })// end of session creation.

  }

  function log(x){
    console.log('[CLEVERBOT] ' + x);
  }

}

module.exports = talkBack;
