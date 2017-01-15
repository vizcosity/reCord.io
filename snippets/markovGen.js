var fs = require('fs');
// var firstArg = process.argv[2];
// var sourceText=fs.readFileSync(firstArg, 'utf8');
// //var sourceText="the theremin is theirs. ok? yes that does make sense that this is good because it is good.";
// //console.log("SOURCE: "+sourceText);
// var order = parseInt(process.argv[3]);
// var limit = parseInt(process.argv[4]);
//
//
// comprehend(sourceText);
//
// generateMarkov();

function comprehend(sourceText, order,  callback){
  var ngrams = {};

  // Looping through the source text and grabbing the grams from the text.
  for (var i = 0; i < sourceText.length - order; i++){

    var gram = sourceText.substring(i, i+order);

    // If array of following characters doesn't exist, create it.
    if (!ngrams[gram]) ngrams[gram] = [];

    // Push the next character to the key array of the grams.
    ngrams[gram].push(sourceText.charAt(i+order));
  }

  if (callback) callback(ngrams);

}

function generateMarkovText(ngrams, firstWord, order, limit, callback){

  var output = firstWord; // Starts with the first thing of the source text.

  // Finish NEAR the limit -- end at the last subsequent

  var i = 0;
  var limitReached = false;
  while (!limitReached || (i > limit + 20)){

    var randomChar = randomElement(ngrams[output.substring(output.length-order,output.length)]);

    if (!randomChar) break;

    // console.log(ngrams[output.substring(output.length-order,output.length)]);
    // console.log(output.substring(output.length-order, output.length)+": "+randomChar);

    // If limit has been passed, break on next space. (indicates that it is currently on the end of a word.)
    if (i >= limit && randomChar == " ") {limitReached = true; break;}

    output += randomChar;

    i++;
  }

  if (callback) callback(output);
}

function firstWord(sourceText, order){
  // Takes in the sourceText, finds a random first word that could be used.
  // var words = sourceText.split(' ').filter(function(element){return element.length == order});
  // var random = randomElement((words.length > 0 ? words : [sourceText.substring(0,order)]));
  // return random;
  // console.log(sourceText.substring(0, order));
  // return sourceText.split(' ');
  // return sourceText.substring(0,order);
  var words = sourceText.split(' ');
  var orderLengthWords = words.filter(function(element){return element.length == order});

  if (orderLengthWords.length >= 1) return randomElement(orderLengthWords);

  return sourceText.substring(0,order);
}

function generateMarkov(sourceText, order, limit, callback){

  comprehend(sourceText, order, function(ngrams){
    // ngrams is the comprehended sourcetext.

    generateMarkovText(ngrams, firstWord(sourceText, order), order, limit, function(generatedMarkov){
      if (callback) return callback(generatedMarkov, ngrams);
    });

  });


}

module.exports = generateMarkov;

function randomElement(array){
  try {
    // console.log("RANDOM:");
    // console.log(array);
    // if (!array) return console.log("FAILED");
    return array[Math.floor(Math.random()*array.length)];
  } catch(e){console.log("[MARKOVGEN.JS] " + e); return "";}

}
