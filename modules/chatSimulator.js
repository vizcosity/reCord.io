// MODULES
var external = {
  snippet: {
    scrape: require("../snippets/channelMessageScraper"),
    markov: require("../snippets/markovGen")
  }
}
var Messenger = require("../snippets/message.js");


// DISCORD CHAT SIMULATOR BUILT WITH MARKOV CHAINS. @ AARON BAW 2017
function chatSimulator(bot, cmd){
  var simulating = {};
  var msg = new Messenger(bot, cmd.cID);
  if (simulating[cmd.cID]) return msg.error("I'm already simulating a user in this channel. Do "+cmd.prefix+"stopsimulation to stop.");
  simulating[cmd.cID] = true;
  var channelToSimulate = cmd.cID;
  var userToSimulate = cmd.event.d.mentions.length > 0 ? cmd.event.d.mentions[0].id : false;
  if (userToSimulate && !bot.users[userToSimulate]) return msg.error("Could not find user.");

  var globalCallback = null;

  var simulationMode = userToSimulate ? "user" : "channel";

  this.kill = function(cmd, callback){
    // Kills the simulation if it's running.
    simulating[cmd.cID] = false;
    globalCallback = callback;

    log("Attempting to kill simulation: " + cmd.cID);
  }

  msg.notify("Grabbing messages from " + simulationMode + ": "+ (userToSimulate ? bot.users[userToSimulate].username : bot.channels[cmd.cID].name) + " from this text channel. This could take a while.");

  external.snippet.scrape(bot, cmd.cID, function(messages){

    // Check that there are available messages if user:
    if (userToSimulate && !messages[userToSimulate]) return msg.error("Could not find messages by this user in this text channel.");

    var fullText = "";

    var targetedArray = userToSimulate ? messages[userToSimulate].messages : messages.channelText;

    for (var i = 0; i < targetedArray.length; i++){
      var cm = userToSimulate ? targetedArray[i] : targetedArray[i].content;

      // Filter out links
      if (cm.indexOf("http") != -1) continue;

      // Filter out common commands.
      if (cm.substring(0,1) == ">") continue;
      if (cm.substring(0,1) == "<") continue;
      if (cm.substring(0,1) == "!") continue;
      if (cm.substring(0,1) == "?") continue;
      if (cm.substring(0,2) == "++") continue;
      if (cm.substring(0,1) == "+") continue;
      if (cm.substring(0,1) == "/") continue;
      if (cm.substring(0,cmd.prefix.length) == cmd.prefix) continue;


      fullText += " "+cm;
    }

    // console.log(fullText);

    var username = userToSimulate ? messages[userToSimulate].name : null;

    msg.notify("Messages obtained. Running comprehension...");

    try {
      continuousMarkovConvo(fullText, 5, 60, function(){
        // This runs once it's done.
        msg.notify("Simulation finished");
        if (globalCallback) globalCallback();
      });
    } catch(e){return log("Markov Simulation: " + e);}

    function continuousMarkovConvo(fullText, order, limit, callback){
      if (!simulating[cmd.cID]) {
        return callback();
      };

      external.snippet.markov(fullText, order, limit, function(markovText){
        // console.log(markovText);
        markovText = formatMarkovText(markovText);
        msg.send((userToSimulate ?  "**"+username+"**: " : "") + markovText, true, function(){
          continuousMarkovConvo(fullText, order, limit, callback);
        });
      });

    }

  });

}

function formatMarkovText(text){
  // Capitalize the first letter, end with a fullstop.
  text = text.substring(0,1).toUpperCase() + text.substring(1, text.length);
  text += ".";
  return text;
}

function log(message){
  console.log("[CHAT SIMULATOR.JS] " + message);
}

module.exports = chatSimulator;
