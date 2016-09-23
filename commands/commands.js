function commandList(bot){
  //grab the useful message functions.
  var messenger = require('../snippets/message.js');
  var msg = new messenger(bot);

  //wrap in try to (hopefully) prevent some crashes.
  try {
    //executable commands.
    this.execute = {

      //roll command
      roll : function(cmd, respond){
        //Roll is a returnable function. If respond is not specified,
        //it will default to true and respond the stringed formatted
        //output to the user. If false, it will just return the output
        //alone and can be used to perhaps make some fun punishment cmds.

        //Setting the default true respond.
        if (typeof respond === 'undefined'){respond=true;}else{respond=false;};

        //find random number from an interval function.
        function randomIntFromInterval(min, max){
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        //setting the channelID to where the command came from. (standard)

        var rollNum = randomIntFromInterval(1,100);

        if (respond){
          msg.setCID(cmd.channelID);
          var stringedMessage = ":game_die: <@" + cmd.uID + "> rolled a **" + rollNum + "**! :game_die:";
          msg.send(stringedMessage);
        };

        //return the output.
        return {
          'num': rollNum,
          'userID': cmd.uID
        };
      },//end of roll.

      smug: function(cmd) {
        msg.setCID(cmd.channelID);

        msg.send(cmd.arg);
        console.log(cmd.arg);
      },

      imgur: function(cmd, callback) {
        try {
          var imgurAPI = require('../snippets/imgurAPI.js');
          var imgur = new imgurAPI();
        } catch(e){ log('Failed to load imgur API: ' + e);};
        msg.setCID(cmd.channelID);
        if (typeof cmd.arg === 'undefined'){
          //no arguments have been passed; return a random image.
          imgur.random(function(result){
                if (typeof result !== 'undefined'){
                  try {
                    var response = "**Random Image**\nTitle: **"+result.title+"**\n:paperclip: "+ result.link;
                    msg.send(response);
                  } catch(e){ log('Problem sending result of imgur search: ' + e)}
                } else {
                  try {
                    msg.send('No results found.');
                  } catch(e){ log('Problem sending no results found (imgur) message: '+e)}
                }
          });
        } else {
          //arguments have been passed, search and return the value.
          try {
            imgur.search(cmd.arg, 'random', function(result){
              if (typeof result !== 'undefined'){
                try {
                  var response = "Searched: **" + cmd.arg + "** :mag:\nFound: **" + result.title+"**\n:paperclip: "+ result.link;
                  msg.send(response);
                } catch(e){ log('Problem sending result of imgur search: ' + e)}
              } else {
                try {
                  msg.send('No results found.');
                } catch(e){ log('Problem sending no results found (imgur) message: '+e)}
              }
            });

          } catch(e){ log('Problem executing imgur search: ' + e);};
        }
      }

    }




  } catch(e){ log(e); };

  //logging function
  function log(msg){
    console.log('[COMMAND] ' + msg);
  };
};

module.exports = commandList;


/*  var cmd = {
    sID: serverID,
    message: channelMsg,
    rawMessage: message,
    arg: null, //this will be changed when passed into the neCommand function.
    user: user,
    uID: userID,
    channelID: channelID //channelID origin for the command message.
  };
  Command info object structure.
*/
