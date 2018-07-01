class twitch {
    constructor (channel, username, password) {
        this.channel = channel;
        this._username = username;
        this._password = password;

        this._request = require("request");
        this._fs = require("fs");

        this.name = "twitch";
        this.displayName = "Twitch.tv";
        this.chatLogoClass = "chat_twitch_logo";

        this._IRC_URL = "irc.twitch.tv";
        this._SMILES_URL = "https://api.twitch.tv/kraken/chat/emoticons";
        this._EMOTICON_FILE_PATH = "twitch/smiles.json";

        this._client = null;
        this._emoticons = null;

        this.onMessage = null;
        this.onStatusChange = null;
        this.onUsersCountChange = null;

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
    }

    postMessage (message, to) {
        if (!this._client) {
            return;
        }
        this._client.say(this.channel, (to ? "@"+to+", " : "") + message);
    }
    
    _connect () {
        try {
            var twitch = require("twitch-js");
            var options = {
                options: {
                    debug: true
                },
                connection: {
                    reconnect: true,
                    secure: true
                },
                channels: ["#" + this.channel]
            };
            if (typeof this._username == "string") {
                options.identity = {
                    username: this._username,
                    password: this._password
                };
            }
    
            this._client = new twitch.client(options);
            this._client.on("connected", function (address, port) {
                console.log("Connected to " + address + ":" + port);
            }.bind(this));
    
            this._client.on("reconnect", function () {
                console.log("Reconnecting to twitch.tv");
            });
    
            this._client.on("chat", function (channel, userstate, message, self) {
                this._processChatMessage(userstate, message);
            }.bind(this));
    
            this._client.on("cheer", function (channel, userstate, message) {
                this._processChatMessage(userstate, message);
            }.bind(this));
            
            this._client.on("subscription", function (channel, user, method, message, userstate) {
                this._processSubscribeMessage(userstate, message);
            }.bind(this));
    
            this._client.on("resub", function (channel, user, months, message, userstate, method) {
                this._processSubscribeMessage(userstate, message);
            }.bind(this));
    
            this._client.connect();
        } catch (err) {
            console.log("Error while initializing connection to twitch.tv. " + err.message + ".");
        }
    }
    
    _processChatMessage (userstate, message) {
        var chatMessage = new Message();
        chatMessage.message = this._processMessageText(message, userstate.emotes);
    
        chatMessage.isPersonal = message.toLowerCase().indexOf(this.channel.toLowerCase()) === 0 ||
                                 message.toLowerCase().indexOf("@" + this.channel.toLowerCase()) === 0;
    
        if (userstate.bits) {
            chatMessage.message = chatMessage.message.replace(/(^|\s)cheer(\d+)(\s|$)/g, function(count) {
                var color;
                if (count >= 10000) {
                    color = "red";
                } else if (count >= 5000) {
                    color = "blue";
                } else if (count >= 1000) {
                    color = "green";
                } else if (count >= 100) {
                    color = "purple";
                } else {
                    color = "gray";
                }
                    
                return "<img src='static-cdn.jtvnw.net/bits/dark/animated/" + color + "/1'>";
            });
    
            chatMessage.isPersonal = true;
            chatMessage.rankId = "donation";
        }
    
        chatMessage.nickname = userstate["display-name"] || userstate.username;
        chatMessage.time = new Date();
    
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _processSubscribeMessage (userstate, message) {
        var chatMessage = new Message();
        
        chatMessage.nickname = userstate["display-name"] || userstate.username || userstate.login;
    
        var sysMessage = userstate["system-msg"];
        if (sysMessage) {
            chatMessage.message = sysMessage.replace(/\\s/g, " ");
            if (chatMessage.message.startsWith(chatMessage.nickname)) {
                chatMessage.message = chatMessage.message.substring(chatMessage.nickname.length + 1);
            }
        } else {
            chatMessage.message = "just subscribed!";
        }
        
        if (message) {
            var processedMessage = this._processMessageText(message, userstate.emotes);
            chatMessage.message += " Message: " + processedMessage;
        }
        
        chatMessage.rankId = "donation";
        chatMessage.time = new Date();
        chatMessage.isPersonal = true;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _processMessageText (message, emotes) {
        if (!emotes) {
            return HtmlTools.anchorLinksEscapeHtml(message);
        }
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
            return first.from - second.from;
        });

        var parts = [];
        var prevTo = 0;
        for (var iPlace = 0; iPlace < placesToReplace.length; ++iPlace) {
            var place = placesToReplace[iPlace];
            if (place.from != prevTo) {
                parts.push(HtmlTools.anchorLinksEscapeHtml(message.substring(prevTo, place.from)));
            }
            var emoticonRegex = message.substring(place.from, place.to);

            var emoticonHtml = "<img class='chat-smile'";

            var emoticonSize = this._emoticons[emoticonRegex];
            if (emoticonSize) {
                emoticonHtml += " width='" + emoticonSize.width + "' height='" + emoticonSize.height + "'";
            }
            emoticonHtml += " src='http://static-cdn.jtvnw.net/emoticons/v1/" + place.emoteId + "/1.0' title='" + emoticonRegex + "'>";

            parts.push(emoticonHtml);

            prevTo = place.to;
        }

        if (prevTo < message.length) {
            parts.push(HtmlTools.anchorLinksEscapeHtml(message.substring(prevTo)));
        }

        return parts.join('');
    }
    
    _fireErrorMessage (messageText) {
        var errorMessage = new Message();
        errorMessage.message = messageText;
        errorMessage.isError = true;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, errorMessage);
        }
    }
    
    _extractEmotionSizes (emoticons) {
        var emoticonSizes = {};
        for (var iEmoticon = 0; iEmoticon < emoticons.length; ++iEmoticon) {
            var emoticon = emoticons[iEmoticon];
            emoticonSizes[emoticon.regex] = {
                "width": emoticon.images[0].width,
                "height": emoticon.images[0].height,
            };
        }
        return emoticonSizes;
    }
    
    _loadEmoticons () {
        return new Promise(function(fulfill, reject) {
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
    }
    
    _requestEmoticons () {
        return new Promise(function(fulfill, reject) {
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
    }
    
    _saveEmoticons () {
        this._fs.writeFile(this._EMOTICON_FILE_PATH, JSON.stringify(this._emoticons, null, 2), function () {
    
        }.bind(this));
    }
}
