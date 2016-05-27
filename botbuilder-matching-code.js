var keywords = {};
var matches = {};

slackBot.use(function(session, next) {
    var matchingSession = matches[session.userData.id];
    if (matchingSession) {
      matchingSession.send(session.message.text);
    }
    next();
});

slackBot.add('/keyword', [
  function(session) {
    builder.Prompts.text(session, 'What keywords?')
  },
  function (currentSession, results, next) {
    var matchingSession = keywords[results.response];
    if (matchingSession) {
        matches[currentSession.userData.id] = matchingSession;
        matches[matchingSession.userData.id] = currentSession;
    } else {
        keywords[results.response] = currentSession;
    }
    next();
  }
]);