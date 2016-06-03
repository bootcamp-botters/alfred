var Botkit = require('botkit');
var request = require('request');
var swearjar = require('swearjar');
var cleanser = require('profanity-cleanser');
var Sibyl = require('./sibyl');
var prefs = new Sibyl();

var userPostbacks = {};

var controller = Botkit.facebookbot({
    access_token: process.env.page_access_token,
    verify_token: process.env.verify_token,
});

// Imporant to set the dictionaries for cleanser
cleanser.setLocale(); 

var bot = controller.spawn({
});

// SERVER
controller.setupWebserver(process.env.PORT, function(err,webserver) {
  controller.createWebhookEndpoints(controller.webserver, bot, function() {
      console.log('This bot is online!!!');
  });
});

var userFirstRun = {};

// user said hello
controller.hears(['hello', '^hi$', '^yo$', '^hey$', 'what\'s up'], 'message_received', function(bot, message) {  // NOTE: Change dialog, add user nickname question linked with database
  if (userMatch[message.user]) {
    bot.reply(userMatch[message.user], 'Matched user: ' + message.text);
  } else if (!userFirstRun[message.user]) {
    userFirstRun[message.user] = 'done';
    bot.reply(message, "Hey there, my name is Alfred. Nice to meet you! Let's have some fun together. Try saying 'quiz', 'chat' or 'help'!");
  } else {
    bot.reply(message, 'Hello, nice to see you again!');
  }
});

// HELP SECTION
controller.hears('^help$', 'message_received', function(bot, message) {
  if (userMatch[message.user]) {
    bot.reply(userMatch[message.user], 'Matched user: ' + message.text);
  } else {
    bot.startConversation(message,function(err,convo) {
      convo.say("Here are my main commands: \n\n• Say 'quiz' or 'test' if you want to answer some questions to help me find you a chat friend \n\n• Say 'chat' or 'match' if you want to chat with someone");
      convo.say("• Say 'stop' if you want to exit a dialogue \n\n• Say 'trivia' if you want to play a game! \n\n• I am also funny, sometimes. Try 'joke' or 'Chuck Norris'. \n\nThat's it, hope it helps!");
      // convo.stop();
    });
  }
});

//The jokessss
controller.hears(['joke', 'pun', 'dad joke'], 'message_received', function(bot, message) {
    if (userMatch[message.user]) {
        var address = 'http://tambal.azurewebsites.net/joke/random';
        request(address, function(err, result) {
            var resultObject = JSON.parse(result.body);
            bot.reply(userMatch[message.user], 'Matched user: ' + message.text);
            bot.reply(message, 'Here is your joke: ' + resultObject.joke);
            bot.reply(userMatch[message.user], 'Here is your joke: ' + resultObject.joke);
    })
  } else {
        var address = 'http://tambal.azurewebsites.net/joke/random';
        request(address, function(err, result) {
            var resultObject = JSON.parse(result.body);
            bot.reply(message,'Here is your joke: ' + resultObject.joke);
    })
  }
});

//Chuck Norris jokes 
controller.hears(['chuck', 'norris', 'noris'], 'message_received', function(bot, message) {
    var address = 'https://api.chucknorris.io/jokes/random';
    if (userMatch[message.user]) {
        request(address, function(err, result) {
            var resultObject = JSON.parse(result.body);
            bot.reply(userMatch[message.user], 'Matched user: ' + message.text);
            bot.reply(userMatch[message.user], resultObject.value);
        });
    } else {
        request(address, function(err, result) {
            var resultObject = JSON.parse(result.body);
            bot.reply(message, resultObject.value);
        });
    }
});

//Trivia game
controller.hears('trivia', 'message_received', function(bot, message) {
    bot.startConversation(message, function(err, convo) {
        var address = 'http://jservice.io/api/random';
        request(address, function(err, result) {
            if (err) {
                console.log(err)
                convo.say('Sorry, there was a problem, please try again.');
            }
            else {
                var resultObject = JSON.parse(result.body);
                var question = resultObject[0].question;
                var responseTrivia = resultObject[0].answer;
                if (responseTrivia.indexOf('<i>') != -1) {
                    responseTrivia = responseTrivia.slice(3).split('</i>')[0];
                } else if (responseTrivia.indexOf('\\') != -1) {
                    responseTrivia = responseTrivia.replace('\\', '');
                }
                
                convo.ask('Here is your question: ' + '*' + question + '*' + '. You have 3 chances!', cancellable(function(response, convo) {
                    if (response.text === responseTrivia || response.text === responseTrivia.toLowerCase()) {
                        convo.say('Congratulations, you found the right answer!');
                        convo.next();
                    }
                    else {
                        secondTry(response, convo, responseTrivia);
                        convo.next();
                    }
                }));
            }
        });
    });
});

var counter = 2;
function secondTry(response, convo, responseTrivia) {
    convo.ask('Wrong answer. Your remaining chances: ' + counter, cancellable(function(response, convo) {
        counter --;
        if (response.text === responseTrivia || response.text === responseTrivia.toLowerCase() && counter > 0) {
            convo.say('Congratulations, you found the right answer!');
            convo.next();
        } else if ((response.text != responseTrivia || response.text != responseTrivia.toLowerCase()) && counter > 0) {
            secondTry(response, convo, responseTrivia);
            convo.next();
        } else {
            convo.say('Sorry, you have lost. The response was: ' + responseTrivia);
            counter = 2;
            convo.next();
        }
    }));
}

// PREFERENCES QUIZ
var thingsArray = ['Lord of the rings', 'Breaking Bad', 'Jurassic Park', 'Electro music', 'Pokemon', 'Titanic', 'Donald Trump', 'Harry Potter', 'Tom Cruise', 'Apple', 'The Big Bang Theory', 'Hip Hop music', 'Family Guy', 'Google', 'Fifty Shades of Grey'];
var userVoted = {};

function sendTest(bot, message) {
  var idx = Math.floor(Math.random() * (thingsArray.length));   // random index of array
  var movie = thingsArray[idx];
  
  if (!userVoted[message.user]) {   // checks if userVoted for current user is created. 
    userVoted[message.user] = [];   // if not, created it and give it an empty array 
  }
  
  if (userVoted[message.user].indexOf(idx) !== -1) {    // if the user already voted on the movie corresponding to the randomly generated index
    if (userVoted[message.user].length === thingsArray.length) {   // if the userVoted array length is the same as the moviesArray, then no more movie is available for voting
      bot.reply(message, 'No more questions, you\'re done!');   // tell the user and exit the function
      return; 
    }
    sendTest(bot, message);    // call sendMovieTest again to generate a new movie index
  }  else {                    // if the user never voted on the current movie, then display the vote choice
    userVoted[message.user].push(idx);  // push that index number into the userVoted array to make sure it doesn't come back
    
    var randomToken = '' + Math.random();
    if (!userPostbacks[message.user]) {
      userPostbacks[message.user] = [];
    }
    userPostbacks[message.user].push(randomToken);
    
    var attachment = {
      'type': 'template',
      'payload': {
        'template_type':'button',
        'text': 'Do you like: ' + movie + '?',
        'buttons': [
          {
          'type':'postback',
          'title':'Like!',
          'payload': 'POSTBACK_like_movie_' + randomToken + '_' + idx
          },
          {
          'type':'postback',
          'title':'Dislike...',
          'payload':'POSTBACK_dislike_movie_' + randomToken + '_' +idx
          },
          {
            'type': 'postback',
            'title': 'STOP',
            'payload': 'POSTBACK_stop_movie_' + randomToken
          }
        ]
      }
    };
    
    bot.reply(message, {
        attachment: attachment,
    });
  }
}

controller.hears(['test', 'quiz', 'test', 'preferences'], 'message_received', sendTest);

function checkToken(user, token) {
  if (!userPostbacks[user]) {
    return false;
  }

  var idx = userPostbacks[user].indexOf(token);
  
  if (idx === -1) {
    return false;
  }
  
  userPostbacks[user].splice(idx, 1);
  return true;
}

controller.on('facebook_postback', function(bot, message) {
  var likeRegex = /^POSTBACK_like_movie_(.+)_(\d+)$/;
  var dislikeRegex = /^POSTBACK_dislike_movie_(.+)_(\d+)$/;
  var stopRegex = /^POSTBACK_stop_movie_(.+)$/;
  
  var matches = message.payload.match(likeRegex);
  if (matches) {
    var token = matches[1];
    if (!checkToken(message.user, token)) {
      return;
    }
    bot.reply(message, 'Ok, liked!');
    prefs.recordLike(message.user, 'movie_'+matches[2]);
    sendTest(bot, message);
  }
  else {
    matches = message.payload.match(dislikeRegex);
    if (matches) {
      token = matches[1];
      if (!checkToken(message.user, token)) {
        return;
      }
      bot.reply(message, 'Ok, disliked!');
      prefs.recordDislike(message.user, 'movie_'+matches[2]);
      sendTest(bot, message);
    }
    else {
      matches = message.payload.match(stopRegex);
      if (matches) {
        token = matches[1];
        if (!checkToken(message.user, token)) {
          return;
        }
        bot.reply(message, 'OK, I will stop asking you questions for now!');
      }
    }
  }
});

// middleware to cancel a conversation
function cancellable(callback) {
  var stopPattern = {
    pattern: '^(cancel|stop)$',
    callback: function(message, convo) {
      convo.stop();
    }
  };

  if (Array.isArray(callback)) {
    return callback.concat(stopPattern);
  }

  return [
    {
      default: true,
      callback: callback
    },
    stopPattern
  ];
}

var matches = {};
var dontChat = {};

controller.hears('^stop$', 'message_received', function(bot, message) {
  var randomToken = '' + Math.random();
  if (!userPostbacks[message.user]) {
    userPostbacks[message.user] = [];
  }
  userPostbacks[message.user].push(randomToken);
  
  if (userMatch[message.user]) {
    bot.reply(message, 'Ok, I will remove you from the conversation!');
    bot.reply(userMatch[message.user], 'You and the other user have been disconnected.');
    var matched = userMatch[message.user];

    userMatch[message.user] = null;
    userMatch[matched.user] = null;
    
    var attachment = {
      'type': 'template',
      'payload': {
        'template_type':'button',
        'text': 'Why did you want to leave?',
        'buttons': [
          {
          'type':'postback',
          'title':'I have to go..',
          'payload':'POSTBACK_chatstop_gtg_'+randomToken
          },
          {
          'type':'postback',
          'title':'Didn\'t like the user',
          'payload':'POSTBACK_chatstop_dislike_'+randomToken+'_'+matched.user
          }
        ]
      }
    };
    
    bot.reply(message, {
        attachment: attachment,
    });
  }
});

controller.on('facebook_postback', function(bot, message) {
  var gtgRegex = /^POSTBACK_chatstop_gtg_(.+)$/;
  var dislikeRegex = /^POSTBACK_chatstop_dislike_(.+)_(\d+)$/;
  
  // or make it into an object
  // if (typeof message.payload !== 'string') {
  //   return; 
  // }

  var matches = message.payload.match(gtgRegex);
  if (matches) {
    var token = matches[1];
    if (!checkToken(message.user, token)) {
      return;
    }
    bot.reply(message, 'Ok, I understand! :)');
  }
  else {
    var matches = message.payload.match(dislikeRegex);
    if (matches && matches.length === 2) {
      var token = matches[1];
      if (!checkToken(message.user, token)) {
        return;
      }
      if (!dontChat[message.user]) {
        dontChat[message.user] = [];
      } 
      dontChat[message.user].push(matches[1]);
      bot.reply(message, 'Ok, I\'m going to make sure that you don\'t end up in a chat with this person again in the future.');
    }
  }
});


// CHAT : IF NOT IN CONVO, CALL MATCHING OPTIONS MENU

controller.hears(['^match$', '^chat$', '^friend$'], 'message_received', function(bot, message) {
  if (userMatch[message.user]) {
    bot.reply(message, 'You are already in a conversation!');
    return;
  } else {
    sendMatchingOptions(bot, message);
  }
});


// MATCHING OPTIONS MENU

function sendMatchingOptions(bot, message) {
  var randomToken = '' + Math.random();
  if (!userPostbacks[message.user]) {
    userPostbacks[message.user] = [];
  }
  userPostbacks[message.user].push(randomToken);

  var attachment = {
    'type': 'template',
    'payload': {
      'template_type':'button',
      'text': 'How accurately would you like to be matched with another user (based on your quiz preferences)? Keep in mind that a higher match can also mean a longer waiting time!',
      'buttons': [
        {
        'type':'postback',
        'title':'Very good match',
        'payload': 'POSTBACK_very_good_match_'+randomToken
        },
        {
        'type':'postback',
        'title':'OK match',
        'payload':'POSTBACK_ok_match_'+randomToken
        },
        {
          'type': 'postback',
          'title': 'Randomly',
          'payload': 'POSTBACK_random_match_'+randomToken
        }
      ]
    }
  };
  
  bot.reply(message, {
      attachment: attachment,
  });
}

// Pools for matches
var wantsVeryGoodMatch = [];
var wantsOkMatch = [];
var wantsWhateverMatch = [];

controller.on('facebook_postback', function(bot, message) {
  var veryGoodRegex = /^POSTBACK_very_good_match_(.+)$/;
  var okRegex = /^POSTBACK_ok_match_(.+)$/;
  var randomRegex = /^POSTBACK_random_match_(.+)$/;
  
  var matches = message.payload.match(veryGoodRegex);
  if (matches) {
    var token = matches[1];
    if (!checkToken(message.user, token)) {
      return;
    }
    
    var choice = 'wantsVeryGoodMatch';
    pushingUserIntoChosenPool(bot, message, wantsVeryGoodMatch, choice);
  } 
  else {
    matches = message.payload.match(okRegex);
    if (matches) {
      token = matches[1];
      if (!checkToken(message.user, token)) {
        return;
      }
      
      choice = 'wantsOkMatch';
      pushingUserIntoChosenPool(bot, message, wantsOkMatch, choice);
    }
    else {
      matches = message.payload.match(randomRegex);
      if (matches) {
        token = matches[1];
        if (!checkToken(message.user, token)) {
          return;
        }
        
        choice = 'wantsWhateverMatch';
        pushingUserIntoChosenPool(bot, message, wantsWhateverMatch, choice);
      }
    } 
  }
});


// PUSHING USERS INTO THE RIGHT POOL (ACCORDING TO CHOICE)

function pushingUserIntoChosenPool(bot, message, array, choice) {
  var userPrefsArray = [];
  for (var users in prefs.users) {
    userPrefsArray.push(users);
  }
  
  if (userPrefsArray.indexOf(message.user) === -1) {    // if no prefs, send user to wantsWhateverMatch array
    bot.reply(message, 'Sorry. Since I can\'t find any of your preferences, I will have to match you randomly. Please consider taking a quiz if you want better results. :)');
    bot.reply(message, 'Please wait while I find you a matching user to chat with!');
    choice = 'wantsWhateverMatch';
    wantsWhateverMatch.push(message);
    findingPairings(bot, message, wantsWhateverMatch, choice);
  } else {
    bot.reply(message, 'Alright, please wait while I find you a matching user to chat with!');
    array.push(message);
    findingPairings(bot, message, array, choice);
  }
}


// COMPARING LIKES AND DISLIKES, MATCHING WITH SIBYL

var userMatch = {};

function findingPairings(bot, message, array, choice) {
  
  if (array.length > 1) {
    var u1 = message.user;
    var possiblePairs = [];
    
    array.forEach(function(u2) {
      var u2Session = u2;
      u2 = u2.user;
      
      if (choice === 'wantsVeryGoodMatch') {  // SIBYL RESULT >= 0.6
        console.log('THE SIMILARITY BETWEEN ' + u1 + ' and ' + u2 + ' is :' + prefs.getSimilarityBetween(u1, u2));
        
        if ((prefs.getSimilarityBetween(u1, u2) >= 0.6) && (u1 !== u2)) {
          
          var pair = { 
            id: u2,
            score: prefs.getSimilarityBetween(u1, u2),
            session: u2Session
          };
          
          possiblePairs.push(pair);
        }
      }
      else if (choice === 'wantsOkMatch') { // SIBYL RESULT >= 0.2
        console.log('THE SIMILARITY BETWEEN ' + u1 + ' and ' + u2 + ' is :' + prefs.getSimilarityBetween(u1, u2));
        if ((prefs.getSimilarityBetween(u1, u2) >= 0.2) && (prefs.getSimilarityBetween(u1, u2) < 0.6) && (u1 !== u2)) {
          var pair = { 
            id: u2,
            score: prefs.getSimilarityBetween(u1, u2),
            session: u2Session
          };
          possiblePairs.push(pair);
        }
      }
      else if (choice === 'wantsWhateverMatch') {
        if (u2 && (u1 !== u2)) {  // MATCH WITH ANY OTHER USER WHO WANTS A RANDOM MATCH
          var pair = { 
            id: u2,
            session: u2Session
          };
          possiblePairs.push(pair);
        }
      }
    });
    
    if (possiblePairs.length > 1) {
      possiblePairs.sort(function(a, b) {
        return b.score - a.score;
      });
      matching(bot, message, array, u1, possiblePairs[0].id, possiblePairs[0].session);
    }
    else if (possiblePairs.length === 1) {
      matching(bot, message, array, u1, possiblePairs[0].id, possiblePairs[0].session);
    }
    
  } else {
    console.log('only one person in match array');
    return;
  }
}


// actual matching function

function matching(bot, message, array, u1, u2, u2Session) {
  if (array.indexOf(message) !== -1) {  // remove users from the pool
    var index = array.indexOf(message);
    array.splice(index, 1);
  }
  
  if (array.indexOf(u2Session) !== -1) {
    var index = array.indexOf(u2Session);
    array.splice(index, 1);
  }
  
  userMatch[message.user] = u2Session;    // match the selected pairing
  userMatch[u2] = message;
  
  bot.reply(message, 'You are now in contact with another user!');
  bot.reply(message, 'You can type \'stop\' at any time to exit the conversation.');
  bot.reply(userMatch[message.user], 'You are now in contact with another user!');
  bot.reply(userMatch[message.user], 'You can type \'stop\' at any time to exit the conversation.');
}


// SWEARJAR

var repliesProfane = ['Watch that mouth of yours!', 'You\'re quite a potty mouth!', 'Let\'s be civilized.', 'Hey, that\'s not nice!'];  // more/better replies?
var replacementWords = [':)',':D',':poop:','<(")'];  // find more?
var jar = {};

function randomNumber (thingToCheck) {
  return Math.round(Math.random() * (thingToCheck.length - 1) + 0);
}

function jarOfShame(message, userJar) {
  var index = randomNumber(repliesProfane);
  bot.reply(message, repliesProfane[index] + '\nYou owe me ' + (userJar * 2) + '$');
}


// Censoring swears during a convo, replacing them with random emoji.
// Also catches every word that the bot hears, either for sending them in a chat, 
// or saying 'I don't understand', when a word doesn't have an assigned command

controller.hears('.*', 'message_received', function(bot, message) {
  if (swearjar.profane(message.text)) {
    
    if (jar[message.user] && !/^POSTBACK_/.test(message.text)) {   // JAR
      jar[message.user] = jar[message.user] + 1;
      jarOfShame(message, jar[message.user]);
      
      if (userMatch[message.user] && !/^POSTBACK_/.test(message.text)) {  // if matched, also send censored message
        var inputString = message.text.toLowerCase();
        var replaceWords = randomNumber(replacementWords);
        var output = cleanser.replace(inputString, 'word', replacementWords[replaceWords]);
        bot.reply(userMatch[message.user], 'Matched user: ' + output);
      }
      
    } else {
      jar[message.user] = 1;
      jarOfShame(message, jar[message.user]);
      
      if (userMatch[message.user] && !/^POSTBACK_/.test(message.text)) {  // if matched, also send censored message
        var inputString = message.text.toLowerCase();
        var replaceWords = randomNumber(replacementWords);
        var output = cleanser.replace(inputString, 'word', replacementWords[replaceWords]);
        bot.reply(userMatch[message.user], 'Matched user: ' + output);
      }
    }
  }
  
  else {
    if (userMatch[message.user] && !/^POSTBACK_/.test(message.text)) {
      bot.reply(userMatch[message.user], 'Matched user: ' + message.text);  // put nickname instead of matched user if available?
    }
    else if (!/^POSTBACK_/.test(message.text)) {
      bot.reply(message, "I'm sorry, I didn't understand... Say 'help' if you need to know more about me!");
    }
  }
});