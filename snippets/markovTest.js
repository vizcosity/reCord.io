var fs = require('fs');
var firstArg = process.argv[2];
var sourceText=fs.readFileSync(firstArg, 'utf8');
//var sourceText="the theremin is theirs. ok? yes that does make sense that this is good because it is good.";
//console.log("SOURCE: "+sourceText);
var order = parseInt(process.argv[3]);
var limit = parseInt(process.argv[4]);


var ngrams = {};

function comprehend(sourceText){


  // Looping through the source text and grabbing the grams from the text.
  for (var i = 0; i < sourceText.length - order; i++){

    var gram = sourceText.substring(i, i+order);

    // If array of following characters doesn't exist, create it.
    if (!ngrams[gram]) ngrams[gram] = [];

    // Push the next character to the key array of the grams.
    ngrams[gram].push(sourceText.charAt(i+order));
  }

   // console.log(ngrams);

}

comprehend(sourceText);

generateMarkov();

function generateMarkov(){

  var output = sourceText.substring(0,order); // Starts with the first thing of the source text.

  for (var i = 0; i < limit; i++) {

    output += randomElement(ngrams[output.substring(output.length-order,output.length)]);

  }

  console.log(output);

}

function randomElement(array){

  //console.log(array);
  try {
    return array[Math.floor(Math.random()*array.length)];
  } catch(e){console.log("Attempting to find something from:"); console.log(array);}
}
