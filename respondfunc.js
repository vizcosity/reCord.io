function respond(msg, channelID){

  bot.sendMessage({
    to: channelID,
    message: msg
  }, function callback(error){
    if (error !== null){
      console.log(error)
    }
  })

}


module.exports = respond();
