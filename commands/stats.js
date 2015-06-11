var PlugBotBase = require("plugbotbase");

var SqliteDao = require("../src/db/SqliteDao");

var LOG = new PlugBotBase.Log("StatsCommand");

var dao;

function init(globalObject) {
    dao = SqliteDao.getInstance(globalObject.config.Emancipator.databaseFile);
}

function handler(event, globalObject) {
    var bot = globalObject.bot;
    var username;

    // Stats is run for a specific user if provided, or else for the user who ran the command
    if (event.args && event.args.length > 0) {
        username = event.args[0];
    }
    else {
        username = event.username;
    }

    dao.findUsersWithSimilarName(username).then(function(users) {
        if (users.length === 0) {
            bot.sendChat("No one was found with a name like '{}'.", username);
            return;
        }

        var requestedUser = users.find(function(user) { return user.username.toLowerCase() === username.toLowerCase(); });

        if (!requestedUser) {
            // Limit the number of users we output to avoid spamming chat
            if (users.length > 5) {
                users.length = 5;
            }

            var possibleUsernames = users.map(function(user) { return user.username; }).join(", ");
            bot.sendChat("No one was found with the name '{}'. Did you mean one of these? {}", username, possibleUsernames);
            return;
        }

        dao.getNumberOfIncomingVotesForUser(requestedUser.userID).then(function(incomingVotesObj) {
            dao.getNumberOfVotesCastByUser(requestedUser.userID).then(function(votesCastObj) {
                dao.getNumberOfPlaysByUser(requestedUser.userID).then(function(numberOfPlays) {
                    var incomingWootPercentage = _calculateWootPercentage(incomingVotesObj);
                    var outgoingWootPercentage = _calculateWootPercentage(votesCastObj);

                    bot.sendChat("{} has played {} songs to EmancipatorBot, receiving {} woots and {} mehs ({}% woot rate).",
                                  requestedUser.username, numberOfPlays, incomingVotesObj.woots, incomingVotesObj.mehs, incomingWootPercentage);

                    bot.sendChat("{} has cast {} woots and {} mehs ({}% woot rate).",
                                  requestedUser.username, votesCastObj.woots, votesCastObj.mehs, outgoingWootPercentage);
                });
            });
        });
    });
}

function _calculateWootPercentage(votesObj) {
    var percentage = 0.0;
    if (votesObj.woots > 0) {
        percentage = votesObj.woots / (votesObj.woots + votesObj.mehs);
    }

    // Round to one decimal place
    return Math.round(percentage * 1000) / 10;
}

module.exports = {
    handler: handler,
    init: init,
    triggers: [ "stats" ]
}
