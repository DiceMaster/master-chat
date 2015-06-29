var gg = function(channel) {
    this.channel = channel;
    this._allSmiles = this._buildAllSmiles(ggSmiles);
    this._findChannelId(this._CHANNEL_URL.replace("%channel%", channel), function (channelId) {
        this._channelId = channelId;
        this._connect();
    }.bind(this));

};

gg.prototype.onMessage = null;
gg.prototype.onStatusChange = null;
gg.prototype.onUsersCountChange = null;

gg.prototype.name = "gg";
gg.prototype.displayName = "GoodGame.ru";
gg.prototype.channel = null;

gg.prototype.chatImage = "gg_logo.png";

gg.prototype.getStatusImage = function (status) {

};

gg.prototype.getSmileImage = function (status) {

};

gg.prototype.stopChat = function () {
    this._isStopped = true;
    if (this._socket != null) {
        this._socket.close();
        this._socket = null;
    }
    clearInterval(this._channelTimerId);
};

gg.prototype._CHAT_URL = "ws://goodgame.ru:8080/";
gg.prototype._CHANNEL_URL = "http://goodgame.ru/api/getchannelstatus?id=%channel%&fmt=json";
sc2tv.prototype._RETRY_INTERVAL = 10000;

gg.prototype._socket = null;
gg.prototype._channelId = null;
gg.prototype._channelTimerId = null;
gg.prototype._isStopped = false;
gg.prototype._allSmiles = null;

gg.prototype._buildAllSmiles = function (ggSmiles) {
    var allSmiles = [];
    for (var index in ggSmiles.Channel_Smiles) {
        ggSmiles.Channel_Smiles[index].forEach(function(s) {
            s.channelId = index;
            allSmiles.push(s);
        });
    }
    return allSmiles.concat(ggSmiles.Smiles);
};

gg.prototype._findChannelId = function (url, onFound) {
    $.getJSON(url).done( function ( data ) {
        if (this._isStopped) {
            return;
        }
        var id;
        for (var prop in data) {
            if (data.hasOwnProperty(prop)) {
                id = prop;
                break;
            }
        }
        clearInterval(this._channelTimerId);
        if (typeof(onFound) === "function") {
            onFound(id);
        }
    }.bind(this)).fail( function () {
        if (this._isStopped) {
            return;
        }
        this._channelTimerId = setInterval(function() {
            this._findChannelId(url, onFound);
        }.bind(this), this._RETRY_INTERVAL);
    }.bind(this));
};

gg.prototype._connect = function () {
    this._socket = new SockJS("http://goodgame.ru/chat/websocket/");
    this._socket.onclose = function() {
        this._socket = null;
        setInterval(this._connect.bind(this), this._CHANNEL_RETRY_INTERVAL);
    }.bind(this);
    this._socket.onmessage = function(evt) {
        this._processGoodGameMessage(JSON.parse(evt.data));
    }.bind(this);
};

gg.prototype._processGoodGameMessage = function(message) {
    if (this._isStopped) {
        return;
    }
    switch (message.type) {
        case "welcome":
            var authMessage = {
                "type": "auth",
                "data": {
                    "user_id": 0,
                    "token": ""
                }
            };
            var messageString = JSON.stringify(authMessage);
            this._socket.send(messageString);
            break;
        case "success_auth":
            var unjoinMessage = {
                "type": "unjoin",
                "data": {
                    "channel_id": this._channelId
                }
            };
            this._socket.send(JSON.stringify(unjoinMessage));
            var joinMessage = {
                "type": "join",
                "data": {
                    "channel_id": this._channelId,
                    "hidden": false,
                    "mobile": 0
                }
            };
            this._socket.send(JSON.stringify(joinMessage));
            break;
        case "success_join":
            var channelHistoryMessage = {
                "type": "get_channel_history",
                "data": {
                    "channel_id": this._channelId
                }
            };
            this._socket.send(JSON.stringify(channelHistoryMessage));
            break;
        case "channel_history":
            var messages = message.data.messages;
            for (var iMessage = 0; iMessage < messages.length; ++iMessage) {
                this._processChatMessage(messages[iMessage]);
            }
            break;
        case "message":
            this._processChatMessage(message.data);
            break;
    }
};

gg.prototype._processChatMessage = function(message) {
    var chatMessage = new Message();
    chatMessage.message = this._htmlify(message.text, message.premium);
    chatMessage.nickname = message.user_name;
    chatMessage.id = message.message_id;
    chatMessage.time = new Date(message.timestamp * 1000);
    chatMessage.isPersonal = message.text.indexOf(this.channel + ",") === 0;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, chatMessage);
    }
};

gg.prototype._htmlify = function (message, isPremium) {
    message = message.replace(/[^\u0000-\u00FF\u0400-\uFFFF]+/g, "");
    if (message.indexOf(">http") != -1) {
        var shorter = />(?:(http|https|ftp):\/\/)?(?:((?:[^\W\s]|\.|-|[:]{1})+)@{1})?((?:www.)?(?:[^\W\s]|\.|-)+[\.][^\W\s]{2,4}|localhost(?=\/)|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d*))?([\/]?[^\s\?]*[\/]{1})*(?:\/?([^\s\n\?\[\]\{\}\#]*(?:(?=\.)){1}|[^\s\n\?\[\]\{\}\.\#]*)?([\.]{1}[^\s\?\#]*)?)?(?:\?{1}([^\s\n\#\[\]]*))?([\#][^\s\n]*)?</g;
        var replaceFunc = function(url, protocol, userinfo, host, port, path, filename, ext, query, fragment) {
            var limit = 25;
            var show_www = false;
            var domain = show_www ? host : host.replace(/www\./gi, "");
            var p = decodeURI(path || "/");
            var e = ext || "";
            var f = decodeURI(filename || "") + e;
            var q = decodeURI(query ? "?" + query : "");
            var visibleUrl = domain + p + f + q;
            if (visibleUrl.length > limit && q.length > 1) {
                var ql = limit - (domain + p + f).length - 3;
                if (ql > 0) {
                    q = q.substr(0, ql) + "..."
                } else {
                    q = "?..."
                }
                visibleUrl = domain + p + f + q
            }
            if (visibleUrl.length > limit && p.length > 1) {
                var pl = limit - (domain + f + q).length - 3;
                if (pl > 0) {
                    p = p.substr(0, Math.round(pl / 2)) + "..." + p.substr(p.length - Math.round(pl / 2))
                } else {
                    p = "/.../"
                }
                visibleUrl = domain + p + f + q
            }
            if (visibleUrl.length > limit) {
                var fl = limit - (domain + q).length - 4;
                var pf = (path || "/") + f;
                if (fl > 0) {
                    f = "/..." + pf.substr(pf.length - fl)
                } else {
                    f = "/..." + pf.substr(pf.length - 10)
                }
                visibleUrl = domain + f + q
            }
            return ' title="' + url.substring(1, url.length - 1) + '">' + visibleUrl + "<"
        };
        message = message.replace(shorter, replaceFunc);
    }

    for (var i = 0, len = this._allSmiles.length; i < len; ++i) {
        if (message.indexOf(":" + this._allSmiles[i].name + ":") != -1) {
            if (this._allSmiles[i].animated && isPremium) {
                var animatedImgString = "<img src='http://goodgame.ru/images/chat/blank.gif' title='smilename' name='smilename' class='smiles smilename animated'>".replace(/smilename/g, this._allSmiles[i].name);
                message = message.split(":" + this._allSmiles[i].name + ":").join(animatedImgString);
            } else {
                var imgString = "<img src='http://goodgame.ru/images/chat/blank.gif' title='smilename' name='smilename' class='smiles smilename'>".replace(/smilename/g, this._allSmiles[i].name);
                message = message.split(":" + this._allSmiles[i].name + ":").join(imgString);
            }
        }
    }
    return message;
};

