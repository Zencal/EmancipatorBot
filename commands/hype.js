var PlugBotBase = require("plugbotbase");

var LOG = new PlugBotBase.Log("HypeCommand");

function handler(event, globalObject) {
    var bot = globalObject.bot;
    var message = globalObject.config.Emancipator.Hype && globalObject.config.Emancipator.Hype.message;

    if (!message) {
        LOG.warn("hype command received but no message is configured");
        return;
    }

    bot.sendChat(message);
}

module.exports = {
    handler: handler,
    triggers: [ "hype" ]
}
