// These are where the subcommands and utility methods for queue subcommands will be stored.
module.exports = {
  shuffle: function(cmd, voice){
    try {
      voice.shuffleQueue(cmd);
    } catch(e){log("Shuffling Queue: "+e)}
  },

  clear: function(cmd, voice){
    try {
      voice.clearQueue(cmd);
    } catch(e){log("Clearing Queue: "+e)}
  },

  rename: function(cmd, voice){
    try {
      voice.renameQueueItem(cmd);
    } catch(e){log("Renaming Queue: "+e)}
  },

  next: function(cmd, voice){
    try {
      voice.queueNext(cmd);
    } catch(e){log("Queueing Next: " + e)}
  }
}

function log(message){
  console.log("[SUB_QUEUE.js] " + message);
}
