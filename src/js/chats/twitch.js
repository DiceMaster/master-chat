import {Message} from '/src/js/model/message.js';
import {ChannelStatus} from '/src/js/model/channelStatus.js';
import {HtmlTools} from '/src/js/util/htmlTools.js';

export class twitch {
    constructor (channel, username, password) {
        this.channel = channel;
        this._username = username;
        this._password = password;

        this._request = require("request");
        this._fs = require("fs");

        this.name = "twitch";
        this.displayName = "Twitch.tv";
        this.chatLogoClass = "chat_twitch_logo";

        this._CLIENT_ID = "pzwxcc3xqzrlkbmz0nzxn7pt4xit46";
        this._STREAM_STATS_URL = "https://api.twitch.tv/helix/streams?user_login=";
        this._STATUS_UPDATE_INTERVAL = 60000;

        this._client = null;

        this.onMessage = null;
        this.onStatusChanged = null;

        this._connect();

        this._fetchStatus();
    }

    postMessage (message, to) {
        if (!this._client) {
            return;
        }
        this._client.say(this.channel, (to ? "@"+to+", " : "") + message);
    }

    _fetchStatus () {
        fetch(this._STREAM_STATS_URL + this.channel, {
                headers: { "Accept": "application/vnd.twitchtv.v5+json",
                           "Client-ID": this._CLIENT_ID }
            })
            .then(function(response) {
                    return response.json();
                }.bind(this)
            ).then(function(json) {
                    let status = ChannelStatus.Status.Offline;
                    let viewers = 0;

                    const data = json.data;
                    if (data && data.length > 0) {
                        const dataObj = data[0];
                        if (dataObj.type === 'live') {
                            status = ChannelStatus.Status.Live;
                        }
                        if (typeof dataObj.viewer_count === "number") {
                            viewers = dataObj.viewer_count;
                        }
                    }

                    if (typeof this.onStatusChanged === "function") {
                        this.onStatusChanged(status, viewers);
                    }

                    setTimeout(this._fetchStatus.bind(this), this._STATUS_UPDATE_INTERVAL);
                }.bind(this)
            ).catch(function(error) {
                    console.log(error);

                    if (typeof this.onStatusChanged === "function") {
                        this.onStatusChanged(ChannelStatus.Status.Unknown, 0);
                    }

                    setTimeout(this._fetchStatus.bind(this), this._STATUS_UPDATE_INTERVAL);
                }.bind(this)
            );
    }
    
    _connect () {
        try {
            var twitch = require("tmi.js");
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

            var emoticonHtml = "<img class='chat-smile' src='http://static-cdn.jtvnw.net/emoticons/v1/" + place.emoteId + "/1.0' title='" + emoticonRegex + "'>";

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
}
