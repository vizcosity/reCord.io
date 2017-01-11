var subCommands = require('../config/subCommands.json');
function hasSubCommands(parent){
  return subCommands[parent];
}

module.exports = hasSubCommands;
