// Channel Message scraper
// Takes in the bot element, the textchannelID and grabs every message possible from that channel.

function scraper(bot, channelID, globalCallback){
  var outputText = "";
  var msgs = {};
  msgs.fullArray = [];

  function grabMessages(lastMessageID, callback){
    if (!lastMessageID) return callback();
    bot.getMessages({
      channelID: channelID,
      before: lastMessageID,
      limit: 100
    }, function(err, msgArray){

      if (err) return log("GET: " + err);

      msgs.fullArray = msgs.fullArray.concat(msgArray);
      lastMessageID = msgArray.length > 0 ? msgArray[msgArray.length-1].id : false;

      // console.log(msgs.fullArray);

      grabMessages(lastMessageID, callback);
    }); // First grab callback;

}

  // First scrape:
  bot.getMessages({
    channelID: channelID,
    limit: 100
  }, function(err, msgArray){
    if (err) return log("FIRST GET: " + err);
    // console.log(msgArray);
    msgs.fullArray = msgs.fullArray.concat(msgArray);
    if (msgArray.length == 0) return log("NO MESSAGES FOUND.");
    var lastMessageID = msgArray[msgArray.length - 1].id;
    grabMessages(lastMessageID, function(){
      // This will run when the collection is finished.

      formatMessages(msgs.fullArray, function(grabbed){
        // console.log("HEY");
        // console.log(msgs);
        if (globalCallback) globalCallback(grabbed);
      });

    })

  });

}

function log(message){
  console.log("[CHANNEL TEXT SCRAPER] "+message);
}

function formatMessages(array, callback){
  var output = {};
  output.channelText = [];
  for (var i = 0; i < array.length; i++){
    // console.log(array[i]);
    output.channelText.push({
      content: array[i].content,
      user: {
        name: array[i].author.username,
        id: array[i].author.id
      }
    });

    if (!output[array[i].author.id]){
      output[array[i].author.id] = {};
      output[array[i].author.id].name = array[i].author.username;
      output[array[i].author.id].messages = [];
    };

    output[array[i].author.id].messages.push(array[i].content);
  }

  if (callback) callback(output);
}




module.exports = scraper;
