var twitch = function (channel) {
    this.channel = channel;
    this._connect();
};

twitch.prototype.onMessage = null;
twitch.prototype.onStatusChange = null;
twitch.prototype.onUsersCountChange = null;

twitch.prototype.name = "twitch";
twitch.prototype.displayName = "Twitch.tv";
twitch.prototype.channel = null;

twitch.prototype.chatImage = "twitch_logo.png";

twitch.prototype._IRC_URL = "irc.twitch.tv";
twitch.prototype._SMILES_URL = "https://api.twitch.tv/kraken/chat/emoticons";
twitch.prototype._EMOTICON_FILE_PATH = "twitch/smiles.js";

twitch.prototype._connect = function () {
    var tmi = require("tmi.js");
    var options = {
        options: {
            debug: true
        },
        connection: {
            random: "chat",
            reconnect: true
        },
        channels: ["#" + this.channel]
    };

    var client = new irc.client(options);
    client.on("connected", function (address, port) {
        console.log("Connected to " + address + ":" + port);
    }.bind(this));

    client.on("chat", function (channel, user, message, self) {
        if (!self) {
            this._processChatMessage(user, message);
        }
    }.bind(this));
    client.connect();
};

twitch.prototype._processChatMessage = function(fromUser, message) {
    var chatMessage = new Message();
    chatMessage.message = this._htmlify(message, fromUser.emotes);
    chatMessage.nickname = fromUser["display-name"] || fromUser.username;
//    chatMessage.id = message.message_id;
    chatMessage.time = new Date();
    chatMessage.isPersonal = message.toLowerCase().indexOf(this.channel.toLowerCase()) === 0 ||
                             message.toLowerCase().indexOf("@" + this.channel.toLowerCase()) === 0;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, chatMessage);
    }
};

twitch.prototype._htmlify = function(message, emotes) {
    if (emotes) {
        var placesToReplace = [];
        for (var emoteId in emotes) {
            for (var iRange = 0; iRange < emotes[emoteId].length; ++iRange) {
                var range = emotes[emoteId][iRange];
                var rangeParts = range.split('-');
                placesToReplace.push({
                    "emoteId": emoteId,
                    "from": parseInt(rangeParts[0]),
                    "to": parseInt(rangeParts[1]) + 1
                });
            }
        }
        placesToReplace.sort(function(first, second) {
            return second.from - first.from;
        });
        if (placesToReplace.length > 1) {
            console.log(JSON.stringify(placesToReplace));
        }
        for (var iPlace = 0; iPlace < placesToReplace.length; ++iPlace) {
            var place = placesToReplace[iPlace];
            message = message.substring(0, place.from) + "<img src='http://static-cdn.jtvnw.net/emoticons/v1/" + place.emoteId + "/1.0' title='" + message.substring(place.from, place.to) + "'>" + message.substring(place.to);
        }
    }

    return message;
};
