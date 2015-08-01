var PlugBotBase = require("plugbotbase");

var SqliteDao = require("../src/db/SqliteDao");

var LOG = new PlugBotBase.Log("StatsCommand");

var dao;
var statsUrl;

function init(globalObject) {
    var serverConfig = globalObject.config.Emancipator.HttpServer;
    dao = SqliteDao.getInstance(globalObject.config.Emancipator.databaseFile);

    statsUrl = "http://" + serverConfig.hostname;
    if (serverConfig.port != 80) {
        statsUrl = statsUrl + ":" + serverConfig.port;
    }

    statsUrl = statsUrl + "/stats/{{userId}}";
}

function handler(event, globalObject) {
    var bot = globalObject.bot;
    var username;

    // Stats is run for a specific user if provided, or else for the user who ran the command
    if (event.args && event.args.length > 0) {
        username = event.args.join(" ");

        if (username.indexOf("@") === 0) {
            username = username.substring(1);
        }
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

        var promises = [
            dao.getIncomingVotesForUser(requestedUser.userID),
            dao.getVotesCastByUser(requestedUser.userID),
            dao.getNumberOfPlaysByUser(requestedUser.userID)
        ];

        Promise.all(promises).then(function(values) {
            var incomingVotesObj = values[0];
            var votesCastObj = values[1];
            var numberOfPlays = values[2];

            var incomingWootPercentage = _calculateWootPercentage(incomingVotesObj);
            var outgoingWootPercentage = _calculateWootPercentage(votesCastObj);
            var userUrl = statsUrl.replace("{{userId}}", requestedUser.userID);

            bot.sendChat("{} has played {} songs to EmancipatorBot, receiving {} woots and {} mehs ({}% woot rate).",
                          requestedUser.username, numberOfPlays, incomingVotesObj.woots, incomingVotesObj.mehs, incomingWootPercentage);

            bot.sendChat("{} has cast {} woots and {} mehs ({}% woot rate).",
                          requestedUser.username, votesCastObj.woots, votesCastObj.mehs, outgoingWootPercentage);

            bot.sendChat("View more at {}", userUrl);
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
