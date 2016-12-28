// These are where the subcommands and utility methods for queue subcommands will be stored.
module.exports = {
  shuffle: function(cmd, voice){
    try {
      voice.shuffleQueue(cmd);
    } catch(e){log(e)}
  },

  clear: function(cmd, voice){
    try {
      voice.clearQueue(cmd);
    } catch(e){log(e)}
  }
}

function log(message){
  console.log("[SUB_QUEUE.js] " + message);
}
