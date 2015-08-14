var twitch = function (channel) {
    this.channel = channel;

    this._promise = require("promise");
    this._request = require("request");
    this._fs = require("fs");

    var fileLoadFailed = false;
    var requestFailed = false;
    this._loadEmoticons()
        .then(function(emoticons) {
                if (this._emoticons) {
                    this._saveEmoticons();
                } else {
                    this._emoticons = emoticons;
                    this._connect();
                }
            }.bind(this)
        )
        .catch(function() {
                fileLoadFailed = true;
                if (requestFailed) {
                    this._fireErrorMessage("Ошибка подключения к Twitch каналу " + channel +
                        ". Не удалось получить список смайлов как от сервера, так и из кэша.");
                }
            }.bind(this)
        );

    this._requestEmoticons()
        .then(function(emoticons) {
                var emoticonsAlreadyLoaded = !!this._emoticons;
                this._emoticons = this._extractEmotionSizes(emoticons);
                if (fileLoadFailed || emoticonsAlreadyLoaded) {
                    this._saveEmoticons();
                }
                if (!emoticonsAlreadyLoaded) {
                    this._connect();
                }
            }.bind(this)
        )
        .catch(function(err) {
                requestFailed = true;
                if (fileLoadFailed) {
                    this._fireErrorMessage("Ошибка подключения к Twitch каналу " + channel +
                        ". Не удалось получить список смайлов как от сервера, так и из кэша.");
                }
            }.bind(this)
        );
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
twitch.prototype._EMOTICON_FILE_PATH = "twitch/smiles.json";

twitch.prototype._emoticons = null;
twitch.prototype._promise = null;
twitch.prototype._request = null;
twitch.prototype._fs = null;


twitch.prototype._connect = function () {
    var tmi = require("tmi.js");
    var options = {
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
        for (var iPlace = 0; iPlace < placesToReplace.length; ++iPlace) {
            var place = placesToReplace[iPlace];
            var emoticonRegex = message.substring(place.from, place.to);
            var emoticonSize = this._emoticons[emoticonRegex];
            if (emoticonSize) {
                message = message.substring(0, place.from) +
                    "<img width='" + emoticonSize.width + "' height='" + emoticonSize.height + "' src='http://static-cdn.jtvnw.net/emoticons/v1/" + place.emoteId + "/1.0' title='" + emoticonRegex + "'>" +
                    message.substring(place.to);
            } else {
                message = message.substring(0, place.from) +
                    "<img src='http://static-cdn.jtvnw.net/emoticons/v1/" + place.emoteId + "/1.0' title='" + emoticonRegex + "'>" +
                    message.substring(place.to);
            }
        }
    }

    return message;
};

twitch.prototype._fireErrorMessage = function (messageText) {
    var errorMessage = new Message();
    errorMessage.message = messageText;
    errorMessage.isError = true;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, errorMessage);
    }
};

twitch.prototype._extractEmotionSizes = function(emoticons) {
    var emoticonSizes = {};
    for (var iEmoticon = 0; iEmoticon < emoticons.length; ++iEmoticon) {
        var emoticon = emoticons[iEmoticon];
        emoticonSizes[emoticon.regex] = {
            "width": emoticon.images[0].width,
            "height": emoticon.images[0].height,
        };
    }
    return emoticonSizes;
};

twitch.prototype._loadEmoticons = function() {
    return new this._promise(function(fulfill, reject) {
        this._fs.exists(this._EMOTICON_FILE_PATH, function(exists) {
            if (this._isStopped) {
                return;
            }
            if (!exists) {
                reject("Файл с описанием смайлов не существует.");
                return;
            }
            this._fs.readFile(this._EMOTICON_FILE_PATH, function (err, data) {
                if (this._isStopped) {
                    return;
                }
                if (err) {
                    reject("Не удается прочитать файл с описанием смайлов.");
                    return;
                }
                var emoticons;
                try {
                    emoticons = JSON.parse(data);
                } catch (ex) {
                    reject("Содержимое файла с описанием самйлов имеет недопустимый формат.");
                    return;
                }
                fulfill(emoticons);
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

twitch.prototype._requestEmoticons = function() {
    return new this._promise(function(fulfill, reject) {
        this._request(this._SMILES_URL, function(error, response, body) {
            if (this._isStopped) {
                return;
            }
            if (error || response.statusCode !== 200) {
                return reject("Не удалось получить описание смайлов.");
            }
            var jsonData;
            try {
                jsonData = JSON.parse(body);
            } catch (ex) {
                reject("полученный список смайлов имеет недопустимый формат.");
                return;
            }
            fulfill(jsonData.emoticons);
        }.bind(this));
    }.bind(this));
};

twitch.prototype._saveEmoticons = function() {
    this._fs.writeFile(this._EMOTICON_FILE_PATH, JSON.stringify(this._emoticons), function () {

    }.bind(this));
};
