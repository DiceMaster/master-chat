class gg {
    constructor (channel, username, password) {
        this.channel = channel;
        this._username = username;
        this._password = password;
        this._request = require("request");

        this.name = "gg";
        this.displayName = "GoodGame.ru";
        this.chatLogoClass = "chat_goodgame_logo";

        this._CHAT_URL = "wss://chat-2.goodgame.ru/chat2/";
        this._LOGIN_URL = " https://goodgame.ru/ajax/chatlogin/";
        this._CHANNEL_STATUS_URL = "http://goodgame.ru/api/getchannelstatus?id=%channel%&fmt=json";
        this._SMILES_DEFINITION_URL = "http://goodgame.ru/js/minified/global.js";
        this._SMILES_COMMON_CSS_URL = "http://goodgame.ru/css/compiled/common_smiles.css";
        this._SMILES_CHANNELS_CSS_URL = "http://goodgame.ru/css/compiled/channels_smiles.css";
        this._RETRY_INTERVAL = 10000;

        this._socket = null;
        this._channelId = null;
        this._isStopped = false;
        this._allSmiles = null;
        this._token = null;
        this._userId = null;

        this.onMessage = null;
        this.onStatusChange = null;
        this.onUsersCountChange = null;

        var resourcesPromise = this._findChannelId(this._CHANNEL_STATUS_URL.replace("%channel%", channel))
            .then(function(channelId){
                this._channelId = channelId;
                return Promise.all([
                    this._getSmileDefinition(this._SMILES_DEFINITION_URL),
                    this._getCss(this._SMILES_COMMON_CSS_URL),
                    this._getCss(this._SMILES_CHANNELS_CSS_URL)
                ]);
            }.bind(this));

        var credentialsProvided = typeof this._username == "string";
        var finalPromise =  credentialsProvided ?
            Promise.all([
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
    }

    stopChat () {
        this._isStopped = true;
        if (this._socket != null) {
            this._socket.close();
            this._socket = null;
        }
    }
    
    postMessage (message, to) {
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
    }
    
    _login () {
        return new Promise(function(fulfill, reject) {
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
    }
    
    _fireErrorMessage (messageText) {
        var errorMessage = new Message();
        errorMessage.message = messageText;
        errorMessage.isError = true;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, errorMessage);
        }
    }
    
    _buildAllSmiles (ggSmiles) {
        var allSmiles = [];
        for (var index in ggSmiles.Channel_Smiles) {
            ggSmiles.Channel_Smiles[index].forEach(function(s) {
                s.channelId = index;
                allSmiles.push(s);
            });
        }
        return allSmiles.concat(ggSmiles.Smiles);
    }
    
    _applyStyle (style) {
        if (gg._styleElement === undefined) {
            gg._styleElement = document.createElement("style");
            gg._styleElement.setAttribute("type", "text/css");
            document.getElementsByTagName('head')[0].appendChild(gg._styleElement);
        }
        style = style.replace(/\/images\/smiles\//g, 'http://goodgame.ru/images/smiles/');
        style = style.replace(/\/images\/anismiles\//g, 'http://goodgame.ru/images/anismiles/');
        gg._styleElement.innerHTML = style;
    }
    
    _findChannelId (url) {
        return new Promise(function(fulfill, reject) {
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
    }
    
    _getSmileDefinition (url) {
        return new Promise(function(fulfill, reject) {
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
    }
    
    _getCss (url) {
        return new Promise(function(fulfill, reject) {
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
    }
    
    _connect () {
        this._socket = new WebSocket(this._CHAT_URL);

        this._socket.addEventListener('open', function (event) {
            console.log('Connected to goodgame.ru');
        }.bind(this));
        this._socket.addEventListener('message', function (event) {
            this._processWebSocketMessage(JSON.parse(event.data));
        }.bind(this));
        this._socket.addEventListener('error', function (err) {
            console.log(err);
        }.bind(this));
        this._socket.addEventListener('close', function () {
            console.log("GG chat closed. Reconnecting.");
            this._socket = null;
            setTimeout(this._connect.bind(this), this._RETRY_INTERVAL);
        }.bind(this));
    }
    
    _processWebSocketMessage (message) {
        if (this._isStopped) {
            return;
        }
        switch (message.type) {
            case "welcome":
                var authMessage = {
                    "type": "auth",
                    "data": {
                        "user_id": this._userId || 0,
                        "token": this._token || ""
                    }
                };
                this._socket.send(JSON.stringify(authMessage));
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
                        "hidden": 0
                    }
                };
                this._socket.send(JSON.stringify(joinMessage));
                break;
            case "success_join":
                var channelHistoryMessage = {
                    "type": "get_channel_history",
                    "data": {
                        "channel_id": this._channelId,
                        "from": 0
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
            case "premium":
                this._processPremium(message.data);
                break;
            case "payment":
                this._processDonation(message.data);
                break;
        }
    }
    
    _processChatMessage (message) {
        var chatMessage = new Message();
        chatMessage.message = this._htmlify(message.text, message.premium);
        chatMessage.nickname = message.user_name;
        chatMessage.id = message.message_id;
        chatMessage.time = new Date(message.timestamp * 1000);
        chatMessage.isPersonal = message.text.indexOf(this.channel + ",") === 0;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _processPremium (message) {
        var chatMessage = new Message();
        chatMessage.message = "Подписался на премиум!";
        chatMessage.nickname = message.userName;
        chatMessage.isPersonal = true;
        chatMessage.rankId = "donation";
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _processDonation (message) {
        var chatMessage = new Message();
        chatMessage.message = "Поддержал канал на " + message.amount + "₽";
        if (message.message) {
            chatMessage.message += " и сообщает: " + this._htmlify(message.message, true);
        }
    
        chatMessage.nickname = message.userName;
        chatMessage.isPersonal = true;
        chatMessage.rankId = "donation";
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _htmlify (message, isPremium) {
        message = message.replace(/[^\u0000-\u00FF\u0400-\uFFFF]+/g, "");
        message = HtmlTools.anchorLinksEscapeHtml(message);
    
        for (var i = 0, len = this._allSmiles.length; i < len; ++i) {
            if (message.indexOf(":" + this._allSmiles[i].name + ":") != -1) {
                if (this._allSmiles[i].animated && isPremium) {
                    var animatedImgString = "<img src='http://goodgame.ru/images/chat/blank.gif' title='smilename' name='smilename' class='chat-smile smile smilename animated'>".replace(/smilename/g, this._allSmiles[i].name);
                    message = message.split(":" + this._allSmiles[i].name + ":").join(animatedImgString);
                } else {
                    var imgString = "<img src='http://goodgame.ru/images/chat/blank.gif' title='smilename' name='smilename' class='chat-smile smile smilename'>".replace(/smilename/g, this._allSmiles[i].name);
                    message = message.split(":" + this._allSmiles[i].name + ":").join(imgString);
                }
            }
        }
        return message;
    }    
}
