var gg = function(channel) {
    this.channel = channel;
    this._request = require("request");
    this._promise = require("promise");
    this._findChannelId(this._CHANNEL_STATUS_URL.replace("%channel%", channel))
        .then(function(channelId){
                this._channelId = channelId;
                return this._findSmileStylesAndDefinitionsURL(this._CHANNEL_URL + channel);
            }.bind(this))
        .then(function(urls){
                return this._promise.all([
                    this._getSmileDefinition(urls.smileDefinitionUrl),
                    this._getCss(urls.globalSmilesCssUrl),
                    this._getCss(urls.channelsSmilesCssUrl)
                ]);
            }.bind(this))
        .then(function(values){
                this._allSmiles = this._buildAllSmiles(values[0]);
                this._applyStyle(values[1] + "\n" + values[2]);
                this._connect();
            }.bind(this))
        .catch(function (err) {
                this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на GoodGame. " + err);
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
};

gg.prototype._CHAT_URL = "ws://goodgame.ru:8080/";
gg.prototype._CHANNEL_URL = "http://goodgame.ru/chat2/";
gg.prototype._CHANNEL_STATUS_URL = "http://goodgame.ru/api/getchannelstatus?id=%channel%&fmt=json";
gg.prototype._RETRY_INTERVAL = 10000;

gg.prototype._socket = null;
gg.prototype._channelId = null;
gg.prototype._isStopped = false;
gg.prototype._allSmiles = null;
gg.prototype._request = null;
gg.prototype._promise = null;

gg.prototype._fireErrorMessage = function (messageText) {
    var errorMessage = new Message();
    errorMessage.message = messageText;
    errorMessage.isError = true;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, errorMessage);
    }
};

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

gg.prototype._applyStyle = function(style) {
    if (gg._styleElement === undefined) {
        gg._styleElement = document.createElement("style");
        gg._styleElement.setAttribute("type", "text/css");
        document.getElementsByTagName('head')[0].appendChild(gg._styleElement);
    }
    gg._styleElement.innerHTML = style;
};

gg.prototype._findChannelId = function (url) {
    return new this._promise(function(fulfill, reject) {
        this._request(url, function (error, response, body) {
            if (this._isStopped) {
                return;
            }
            if (error || response.statusCode !== 200) {
                return reject("Не удалось получить идентификатор чата");
            }
            var jsonData = JSON.parse(body);
            var id;
            for (var prop in jsonData) {
                if (jsonData.hasOwnProperty(prop)) {
                    id = prop;
                    break;
                }
            }
            fulfill(id);
        }.bind(this));
    }.bind(this));
};

gg.prototype._findSmileStylesAndDefinitionsURL = function (url) {
    return new this._promise(function(fulfill, reject) {
        $.get(url).done(function (data) {
            if (this._isStopped) {
                return;
            }
            var smileDefinitionUrlMatch = data.match(/src="(http:\/\/goodgame\.ru\/js\/minified\/global\.js\?[a-z0-9]*)"/i);
            if (smileDefinitionUrlMatch === null) {
                return reject("Не удалось получить адрес списка смайлов.");
            }
            var globalSmilesCssUrlMatch = data.match(/href="(http:\/\/goodgame.ru\/css\/compiled\/common_smiles\.css\?[a-z0-9]*)"/i);
            if (globalSmilesCssUrlMatch === null) {
                return reject("Не удалось получить адрес стилей общих смайлов.");
            }
            var channelsSmilesCssUrlMatch = data.match(/href="(http:\/\/goodgame.ru\/css\/compiled\/channels_smiles\.css\?[a-z0-9]*)"/i);
            if (channelsSmilesCssUrlMatch === null) {
                return reject("Не удалось получить адрес стилей смайлов каналов.");
            }
            fulfill({
                "smileDefinitionUrl": smileDefinitionUrlMatch[1],
                "globalSmilesCssUrl": globalSmilesCssUrlMatch[1],
                "channelsSmilesCssUrl": channelsSmilesCssUrlMatch[1]
            });
        }.bind(this)).fail(function() {
            if (this._isStopped) {
                return;
            }
            return reject("Не удалось получить адрес стилей и списка смайлов.");
        }.bind(this));
    }.bind(this));
};

gg.prototype._getSmileDefinition = function (url) {
    return new this._promise(function(fulfill, reject) {
        this._request(url, function (error, response, body) {
            if (this._isStopped) {
                return;
            }
            if (error || response.statusCode !== 200) {
                return reject ("Не удалось получить список смайлов.");
            }
            var smileDefinitionMatch = body.match(/var\s+Global\s*=\s*(\{[\s\S]+});/);
            if (smileDefinitionMatch === null) {
                return reject("Не удалось получить список смайлов.");
            }
            var ggSmiles = eval("(" + smileDefinitionMatch[1] + ")");
            fulfill(ggSmiles);
        }.bind(this));
    }.bind(this));
};

gg.prototype._getCss = function (url) {
    return new this._promise(function(fulfill, reject) {
        this._request(url, function (error, response, body) {
            if (this._isStopped) {
                return;
            }
            if (error || response.statusCode !== 200) {
                return reject("Не удалось получить стили смайлов.");
            }
            fulfill(body);
        }.bind(this));
    }.bind(this));
};

gg.prototype._loadSmileStylesAndDefinitions = function (definitionUrl, globalCssUrl, channelsCssUrl, onFound) {
    $.when($.get(definitionUrl),
           $.get(globalCssUrl),
           $.get(channelsCssUrl)
    ).done(function(smilesDefinition, globalCss, channelsCss) {
            if (this._isStopped) {
                return;
            }
            //var smileDefinitionMatch = smilesDefinition[0].match(/var\s+Global\s*=\s*(\{.+)/);
            var smileDefinitionMatch = smilesDefinition[0].match(/var\s+Global\s*=\s*(\{[\s\S]+});/);
            if (smileDefinitionMatch === null) {
                if (typeof(onLoad) === "function") {
                    onLoad(undefined);
                }
                return;
            }
            var ggSmiles = eval("(" + smileDefinitionMatch[1] + ")");
            var combinedCss = globalCss + "\n" + channelsCss;
            if (typeof(onFound) === "function") {
                onFound(ggSmiles, combinedCss);
            }
        }.bind(this)
    ).fail(function() {
            if (this._isStopped) {
                return;
            }
            if (typeof(onFound) === "function") {
                onFound(undefined, undefined);
            }
        });
};

gg.prototype._connect = function () {
    this._socket = new SockJS("http://goodgame.ru/chat/websocket/");
    this._socket.onclose = function() {
        this._socket = null;
        setInterval(this._connect.bind(this), this._CHANNEL_RETRY_INTERVAL);
    }.bind(this);
    this._socket.onmessage = function(evt) {
        this._processWebSocketMessage(JSON.parse(evt.data));
    }.bind(this);
    this._socket.onerror = function(err) {
        console.log(err);
    }.bind(this);
};

gg.prototype._processWebSocketMessage = function(message) {
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

