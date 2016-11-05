// SHORTCUT COMMAND

// The shortcut command should take 3 arguments:
//   * <view / list>
//     * Returns the shortcuts available.
//   * <add / create>
//     * e.g. of syntax: !shortcut add <shortcut name> <what it does>
//     * takes two more arguments:
//       * <shortcut name> <commands to execute>
//   * <remove>
//     * Takes one more argument:
//       * <shortcut name>
//     * e.g. !shortcut <remove> <test>
//
// The shortcut command has certain scopes:
//   * (Lowest): Create personal shortcuts.
//     * These carry across servers.
//   * (Next): Create server-wide shortcuts.
//   * (Next): Create global shortcuts. (Available to all servers)
var shortcuts = require('../config/shortcuts.json');
function shortcut(cmd, msg){

  checkConfiguration(cmd.sID);

  var commandType = cmd.arg.toLowerCase().split(' ')[0];

  switch(commandType){
    case 'view':
    case 'list':
      view(cmd, msg);
      break;
    case 'add':
    case 'create':
      create(cmd, msg);
      break;
    case 'remove':
      remove(cmd, msg);
      break;
    default:
      return log('Invalid argument for cmd type');
  }

}

function view(cmd, msg){
  try {

    msg.setCID(cmd.channelID);
    var stringedOutput = ':link: __**Available Shortcuts**__:\n'

    // If the server has shortcuts configured, save those to this variable:
    var serverShortcuts = !shortcuts['server-wide'][cmd.sID] ? [] : grabShortcutsFrom(shortcuts['server-wide'][cmd.sID], cmd.prefix);
    serverShortcuts.unshift(':busts_in_silhouette: **Server-wide shortcuts**:\n');
    var globalShortcuts = grabShortcutsFrom(shortcuts.global, cmd.prefix);
    globalShortcuts.unshift(':globe_with_meridians: **Global shortcuts**:\n');
    var personalShortcuts = grabShortcutsFrom(shortcuts.personal, cmd.prefix);
    personalShortcuts.unshift(':bust_in_silhouette: **Personal Shortcuts**:\n');

    // This array will hold all of the items.
    var sendArray = [];
    var itemArray = serverShortcuts;
    // console.log(serverShortcuts);
    itemArray.concat(serverShortcuts);
    itemArray.concat(globalShortcuts);
    itemArray.concat(personalShortcuts);
    var group = 0;

    for (var i = 0; i < itemArray.length; i++){
      // log(itemArray[i]);
      // Group elements into 10 each.
      if (i % 10 == 0 && i !== 0) group++;
      if (!sendArray[group]) sendArray[group] = '';

      if (i !== 0)
        sendArray[group] += itemArray[i] + '`\n';
      else
        sendArray[group] += itemArray[i] + '\n';

    }

    msg.send(sendArray[0], false, function(){
      for (var i = 1; i < sendArray.length; i++){
        msg.send(sendArray[i]);
      }
    })

    return;
  } catch(e){ log(e); }
}

function grabShortcutsFrom(object, prefix){
  // This grabs each element from the Object,
  // referneced by the path, and returns an array.

  if (isEmpty(object)) return [];
  // console.log(object);

  var itemArray = [];
  for (var key in object){

    // console.log('Key: ' + key + ', Object:' + object[key]);
    itemArray.push(':black_small_square: **' + prefix +
    key + '**: `' + prefix + object[key]);
  }

  return itemArray;
}

// Object.prototype.isEmpty = function(){
//   return Object.keys(this).length === 0 && this.constructor === Object;
// }

function isEmpty(obj){
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

function create(cmd, msg){
  msg.setCID(cmd.channelID);
  var shortcutName = cmd.arg.toLowerCase().split(' ')[1];
  var commands = require('../config/commands.json')['server-wide'][cmd.sID];
  // Check if desired shortcut exists as command already.

  if (typeof commands[shortcutName] !== 'undefined')
    return msg.notify(':no_entry: Command **'+shortcutName+'** already exists.');

  // Add the shortcut.
  shortcuts[shortcutName] = cmd.arg.substring(cmd.arg.indexOf(shortcutName) + shortcutName.length + 1 , cmd.arg.length);

  __parentDir = require('path').dirname(process.mainModule.filename);
  // Update the JSON file.
  require('fs').writeFile(__parentDir+'/config/shortcut.json', JSON.stringify(shortcuts, null, 2), function callback(err){
    if (err !== null){return console.log(err)};
    log(__parentDir);
    log('Shortcut: ' + shortcutName + ' added by ' + cmd.user);
    msg.notify(':link: Shortcut **'+shortcutName+
    '** added successfully.\n\n:small_blue_diamond: **Runs**: '+
    shortcuts[shortcutName]);
  });

}

function remove(cmd, msg){
  // Update the shortcuts file.
  shortcuts = require('../config/shortcuts.json');

  var shortcutToRemove = cmd.arg;

  
}


function checkConfiguration(serverID){
  if (!shortcuts['server-wide'][serverID]){
    log('Server: ' + serverID + ' has not been set up for shortcuts. Configuring now.');

    // Create server-wide entry here.
    shortcuts['server-wide'][serverID] = {};

    __parentDir = require('path').dirname(process.mainModule.filename);
    // Update the JSON file.
    require('fs').writeFile(__parentDir+'/config/shortcut.json', JSON.stringify(shortcuts, null, 2), function callback(err){
      if (err !== null){return console.log(err)};
      log('Server: ' + serverID + 'configured for permissions.');
    });

    return;


  } else {
    return;
  }
}



function log(text){
  console.log('[SHORTCUT.js] ' + text);
}

module.exports = shortcut;
