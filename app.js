var Botkit = require('botkit');
var request = require('request');
var swearjar = require('swearjar');
var cleanser = require('profanity-cleanser');
var mysql = require('mysql');

var controller = Botkit.facebookbot({
    access_token: process.env.page_access_token,
    verify_token: process.env.verify_token,
});

// Important to set the dictionaries for cleanser
cleanser.setLocale(); 

var bot = controller.spawn({
});

// SERVER
controller.setupWebserver(process.env.PORT, function(err,webserver) {
  controller.createWebhookEndpoints(controller.webserver, bot, function() {
      console.log('This bot is online!!!');
  });
});

// user said hello
controller.hears('hello', 'message_received', function(bot, message) {  // NOTE: Change dialog, add user nickname question linked with database
    if (matches[message.user]) {
    bot.reply(matches[message.user], 'Matched user: ' + message.text);
  } else {
    bot.reply(message, 'Hey there.');
  }
});

//The jokessss
controller.hears(['joke', 'pun', 'dad joke'], 'message_received', function(bot, message) {
    if (matches[message.user]) {
        var address = 'http://tambal.azurewebsites.net/joke/random';
        request(address, function(err, result) {
            var resultObject = JSON.parse(result.body);
            bot.reply(matches[message.user], 'Matched user: ' + message.text);
            bot.reply(message, 'Here is your joke: ' + resultObject.joke);
            bot.reply(matches[message.user], 'Here is your joke: ' + resultObject.joke);
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
    if (matches[message.user]) {
        request(address, function(err, result) {
            var resultObject = JSON.parse(result.body);
            bot.reply(matches[message.user], 'Matched user: ' + message.text);
            bot.reply(matches[message.user], resultObject.value);
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

var keywords = {};
var matches = {};
var suggestions = [];

controller.hears('^stop$', 'message_received', function(bot, message) {
  if (matches[message.user]) {
    bot.reply(message, 'Ok, I will remove you from the conversation!');
    bot.reply(matches[message.user], 'You and the other user have been disconnected.');
    var matched = matches[message.user];

    matches[message.user] = null;
    matches[matched.user] = null;
    
    var attachment = {
      'type': 'template',
      'payload': {
        'template_type':'button',
        'text': 'Why did you want to leave?',
        'buttons': [
          {
          'type':'postback',
          'title':'I have to go..',
          'payload':'gtg'
          },
          {
          'type':'postback',
          'title':'Didn\'t like the user',
          'payload':'dislikePerson'
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
  if (message.payload == 'gtg') {
    bot.reply(message, 'Ok, I understand! :)');
  } else if (message.payload == 'dislikePerson') {
    bot.reply(message, 'Ok, I\'m going to make sure that you don\'t end up in a chat with this person again in the future.');
    // SEND OTHER USER'S ID IN THE BANNED PERSONS COLUMN FOR THE CURRENT USER
  }
});

controller.hears(['^keyword$', '^chat$', '^conversation$', '^friend$'], 'message_received', function(bot, message) {
  if (matches[message.user]) {
    bot.reply(message, 'You are already in a conversation!');
    return;
  }

  bot.startConversation(message, function(err, convo) {
    if (!err) {
      convo.ask('What topic would you be interested in?', cancellable(function(message, convo) {
        convo.next();
      }), {key: 'keyword'});

      convo.on('end', function(convo) {
        if (convo.status == 'completed') {
          var userKeyword = convo.extractResponse('keyword');
            bot.reply(message, 'Alright, please wait while I find you a matching user to chat with!');
              if (keywords[userKeyword]) {
                var matchedMessage = keywords[userKeyword];
                keywords[userKeyword] = null;

                matches[message.user] = matchedMessage;
                matches[matchedMessage.user] = message;

                bot.reply(message, 'You are now in contact with another user!');
                bot.reply(message, 'You can type \'stop\' at any time to exit the conversation.');
                bot.reply(matches[message.user], 'You are now in contact with another user!');
                bot.reply(matches[message.user], 'You can type \'stop\' at any time to exit the conversation.');
              }
              else {
                keywords[userKeyword] = message;
                suggestions.push(userKeyword);
              }
        } else {
          // this happens if the conversation ended prematurely for some reason
          bot.reply(message, 'OK, nevermind!');
        }
      });
    }
  });
});

var repliesProfane = ['Your mama teached you better!', 'Hey, be nice!', 'Come on! Stop it!'];  // more/better replies?
var replacementWords = [':)',':D',':poop:',':|','<(")'];  // find more?
var jar = {};

function randomNumber (thingToCheck) {
  return Math.round(Math.random() * (thingToCheck.length - 1) + 0);
}

function jarOfShame(message, userJar) {
  var index = randomNumber(repliesProfane);
  // bot.reply(message, repliesProfane[index]);
  bot.reply(message, repliesProfane[index] + '\nYou owe me ' + (userJar * 2) + '$');
}

controller.hears('.*', 'message_received', function(bot, message) {
  if (swearjar.profane(message.text)) {
    
    if (jar[message.user]) {   // JAR
      jar[message.user] = jar[message.user] + 1;
      jarOfShame(message, jar[message.user]);
      console.log(jar)
    } else {
      jar[message.user] = 1;
      jarOfShame(message, jar[message.user]);
    }
    
    if (matches[message.user]) { // USER MATCH SWEAR TRANSFORMER
      var inputString = message.text.toLowerCase();
      var replaceWords = randomNumber(replacementWords);
      var output = cleanser.replace(inputString, 'word', replacementWords[replaceWords]);
      bot.reply(matches[message.user], 'Matched user: ' + output);
    } 
  }
  else {
    if (matches[message.user]) {
      bot.reply(matches[message.user], 'Matched user: ' + message.text);  // put nickname instead of matched user if available?
    }
    else {
      bot.reply(message, "I'm sorry, I didn't understand... Say 'help' if you need to know more about me!");
    }
  }
});