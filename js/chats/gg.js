var gg = function(channel, username, password) {
    this.channel = channel;
    this._username = username;
    this._password = password;
    this._request = require("request");
    this._promise = require("promise");

    var resourcesPromise = this._findChannelId(this._CHANNEL_STATUS_URL.replace("%channel%", channel))
        .then(function(channelId){
            this._channelId = channelId;
            return this._promise.all([
                this._getSmileDefinition(this._SMILES_DEFINITION_URL),
                this._getCss(this._SMILES_COMMON_CSS_URL),
                this._getCss(this._SMILES_CHANNELS_CSS_URL)
            ]);
        }.bind(this));

    var credentialsProvided = typeof this._username == "string";
    var finalPromise =  credentialsProvided ?
        this._promise.all([
            resourcesPromise,
            this._login()
        ]) :
        resourcesPromise;

    finalPromise.then(function (results) {
            var resourceValues;
            if (credentialsProvided) {
                resourceValues = results[0];
                this._userId = results[1].userId;
                this._token = results[1].token;
            } else {
                resourceValues = results;
            }
            this._allSmiles = this._buildAllSmiles(resourceValues[0]);
            this._applyStyle(resourceValues[1] + "\n" + resourceValues[2]);

            this._connect();
        }.bind(this)
    ).catch(function (err) {
            this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на GoodGame. " + err);
        }.bind(this));
};

gg.prototype.onMessage = null;
gg.prototype.onStatusChange = null;
gg.prototype.onUsersCountChange = null;

gg.prototype.name = "gg";
gg.prototype.displayName = "GoodGame.ru";
gg.prototype.channel = null;

gg.prototype.chatLogoClass = "chat_goodgame_logo";

gg.prototype.stopChat = function () {
    this._isStopped = true;
    if (this._socket != null) {
        this._socket.close();
        this._socket = null;
    }
};

gg.prototype.postMessage = function(message, to) {
    if (this._isStopped) {
        return;
    }
    if (!this._socket) {
        return;
    }
    var chatMessage = {
        "type": "send_message",
        "data": {
            "channel_id": this._channelId,
            "text": (to + ", " || "") +  message,
            "hideIcon": false,
            "mobile": false
        }
    };
    this._socket.send(JSON.stringify(chatMessage));
};

gg.prototype._CHAT_URL = "http://chat.goodgame.ru/chat/";
gg.prototype._LOGIN_URL = " http://goodgame.ru/ajax/chatlogin/";
gg.prototype._CHANNEL_URL = "http://goodgame.ru/chat2/";
gg.prototype._CHANNEL_STATUS_URL = "http://goodgame.ru/api/getchannelstatus?id=%channel%&fmt=json";
gg.prototype._SMILES_DEFINITION_URL = "http://goodgame.ru/js/minified/global.js";
gg.prototype._SMILES_COMMON_CSS_URL = "http://goodgame.ru/css/compiled/common_smiles.css";
gg.prototype._SMILES_CHANNELS_CSS_URL = "http://goodgame.ru/css/compiled/channels_smiles.css";
gg.prototype._RETRY_INTERVAL = 10000;

gg.prototype._socket = null;
gg.prototype._username = null;
gg.prototype._password = null;
gg.prototype._channelId = null;
gg.prototype._isStopped = false;
gg.prototype._allSmiles = null;
gg.prototype._request = null;
gg.prototype._promise = null;
gg.prototype._token = null;
gg.prototype._userId = null;

gg.prototype._login = function() {
    return new this._promise(function(fulfill, reject) {
        this._request.post({
                url: this._LOGIN_URL,
                form: {login: this._username, password: this._password}
            },
            function (err, response, body) {
                if (this._isStopped) {
                    return;
                }
                if (err || response.statusCode !== 200) {
                    return reject("Не удалось получить токен авторизации.");
                }
                var jsonData = JSON.parse(body);
                if (!jsonData) {
                    return reject("Не удалось обработать ответ на запрос токена автоизации (" + body + ").");
                }
                if (!jsonData.result) {
                    return reject("Ошиба получения токена авторизации. " + jsonData.response);
                }
                fulfill({"userId": jsonData.user_id, "token": jsonData.token });
            }.bind(this)
        );
    }.bind(this));
};

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
    style = style.replace(/\/images\/smiles\//g, 'http://goodgame.ru/images/smiles/');
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
    this._socket = new SockJS(this._CHAT_URL);
    this._socket.onclose = function() {
        console.log("GG chat closed. Reconnecting.");
        this._socket = null;
        setTimeout(this._connect.bind(this), this._RETRY_INTERVAL);
    }.bind(this);
    this._socket.onmessage = function(evt) {
        if (!this._socket) {
            console.log("Received a message while _socket is null. " + JSON.stringify(evt));
            return;
        }
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
                    "site_id": 1,
                    "user_id": this._userId || 0,
                    "token": this._token || ""
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
                    "mobile": false
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
                var animatedImgString = "<img src='http://goodgame.ru/images/chat/blank.gif' title='smilename' name='smilename' class='chat-smile smiles smilename animated'>".replace(/smilename/g, this._allSmiles[i].name);
                message = message.split(":" + this._allSmiles[i].name + ":").join(animatedImgString);
            } else {
                var imgString = "<img src='http://goodgame.ru/images/chat/blank.gif' title='smilename' name='smilename' class='chat-smile smiles smilename'>".replace(/smilename/g, this._allSmiles[i].name);
                message = message.split(":" + this._allSmiles[i].name + ":").join(imgString);
            }
        }
    }
    return message;
};

