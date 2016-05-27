var Botkit = require('botkit');

var controller = Botkit.slackbot();
var os = require('os');

var bot = controller.spawn({
   token: ''  // BOT TOKEN HERE
}).startRTM();

var keywords = {};
var matches = {};
var allMentions = 'direct_message,direct_mention,mention';

controller.hears(['keyword', 'chat', 'friend', 'conversation', 'someone'], allMentions, function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    if (!err) {
      convo.ask('Do you want me to find you a chat friend?', [
        {
          pattern: bot.utterances.yes,
          callback: function(response, convo) {
            convo.next();
          }
        },
        {
          pattern: bot.utterances.no,
          callback: function(response, convo) {
            // stop the conversation. this will cause it to end with status == 'stopped'
            convo.stop();
          }
        },
        {
          default: true,
          callback: function(response, convo) {
            convo.repeat();
            convo.next();
          }
        }
      ]);
    }
    convo.ask('What would you like to talk about? Say CATS or NOT CATS', [
      {
        pattern: 'CATS',
        callback: function(response, convo) {
          convo.say('Awesome, I like cats!');
          convo.next();
        }
      },
      {
        pattern: 'NOT CATS',
        callback: function(response, convo) {
          convo.say('Oh ok, not cats..')
          convo.next();
        }
      }
    ], {'key' : 'keyword'});
    convo.on('end', function(convo) {
      if (convo.status == 'completed') {
        // bot.reply(message, 'Wait while I try to find you a friend');
        controller.storage.users.get(message.user, function(err, user) {
          if (!user) {
            user = {
              id: message.user,
            };
          }
          user.keyword = convo.extractResponse('keyword');
          controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Wait while I try to find you a friend to talk about ' + user.keyword);

            // MATCHING FUNCTIONS HERE ????????????
            
          });
        });
      } else {
        // this happens if the conversation ended prematurely for some reason
        bot.reply(message, 'OK, nevermind!');
      }
    });
  });
});
