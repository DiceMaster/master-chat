class peka2tv {
    constructor (channel, username, password) {
        this.channel = channel;
        this._username = username;
        this._password = password;

        this.name = "peka2tv";
        this.displayName = "peka2.tv";    
        this.chatLogoClass = "chat_peka2tv_logo";

        this._API_URL = "https://peka2.tv";
        this._CHANNEL_RETRY_INTERVAL = 10000;
        this._CHAT_RELOAD_INTERVAL = 5000;

        this._URLPatternStr = '((?:(?:ht|f)tps?)(?:://))' + '(((?:(?:[a-z\u0430-\u0451\\d](?:[a-z\u0430-\u0451\\d-]*[a-z\u0430-\u0451\\d])*)\\.)+(?:[a-z]{2,}|\u0440\u0444)' + '|(?:(?:\\d{1,3}\\.){3}\\d{1,3}))' + '(:\\d+)?' + '(/[-a-z\u0430-\u0451\\d%_~\\+\\(\\):]*(?:[\\.,][-a-z\u0430-\u0451\\d%_~\\+\\(\\):]+)*)*' + '(\\?(?:&amp;|&quot;|&#039|[&"\'.:;a-z\u0430-\u0451\\d%_~\\+=-])*)?' + '(#(?:&amp;|&quot;|&#039|[\*!\(\)\/&"\'.:;a-z\u0430-\u0451\\d%_~\\+=-])*)?)';
        this._bbCodeURLPattern = new RegExp('\\[url\\]' + this._URLPatternStr + '\\[\/url\\]()', 'gi');
        this._bbCodeURLWithTextPattern = new RegExp('\\[url=' + this._URLPatternStr + '\\]([\u0020-\u007E\u0400-\u045F\u0490\u0491\u0207\u0239\u2012\u2013\u2014]+?)\\[\/url\\]', 'gi');
        this._bbCodeBoldPattern = new RegExp('\\[b\\]([\\s\\S]+?)\\[/b\\]', 'gi');
        this._escapeCharMap = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

        this._channelId = null;
        this._socket = null;
        this._token = null;
        this._userId = null;

        this.onMessage = null;
        this.onStatusChange = null;
        this.onUsersCountChange = null;
        
        this._isStopped = false;
        
        this._request = require("request");
        this._smiles = [];
        this._usersIdentifiers = {};
        this._receivedMessageIds = new Set();

        var promises = [this._findChannelId(), this._getSmiles()];
        if (this._username && this._password) {
            promises.push(this._login());
        }
        Promise.all(promises)
            .then(function (results) {
                    this._channelId = results[0];
                    this._smiles = results[1];
                    if (this._username && this._password) {
                        this._token = results[2].token;
                        this._userId = results[2].userId;
                    }
                    this._connect();
                }.bind(this))
            .catch(function (err) {
                    this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на peka2.tv. " + err);
                }.bind(this));
    }

    stopChat () {
        this._stopChat();
    }
    
    postMessage (message, to) {
        if (!this._socket || !this._token) {
            return;
        }
        this._socket.emit('/chat/publish', {
                "channel": "stream/" + this._channelId,
                "from": {
                    "id": this._userId,
                    "name": this._username
                },
                "to": to ? {
                    "id": this._usersIdentifiers[to],
                    "name": to
                } : null,
                "text": message
        });
    }
    
    _fireErrorMessage (messageText) {
        var errorMessage = new Message();
        errorMessage.message = messageText;
        errorMessage.isError = true;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, errorMessage);
        }
    }
    
    _stopChat () {
        this._isStopped = true;
        clearInterval(this._chatTimerId);
        clearTimeout(this._channelTimerId);
        clearTimeout(this._smileDefinitionUrlTimerId);
    }
    
    _login() {
        return new Promise(function (fulfill, reject) {
            this._request({
                    method: "POST",
                    url: this._API_URL + "/api/user/login",
                    json: true,
                    body: {
                        "name": this._username,
                        "password": this._password,
                    }
                },
                function (err, response, body) {
                    if (this._isStopped) {
                        return;
                    }
                    if (err || response.statusCode !== 200) {
                        return reject("Не удалось получить токен для бота.");
                    }
                    fulfill({ "token": body.token, "userId": body.current.id});
                }.bind(this)
            );
        }.bind(this));
    }
    
    _findChannelId () {
        return new Promise(function (fulfill, reject) {
            this._request({
                    method: "POST",
                    url: this._API_URL + "/api/user",
                    json: true,
                    body: {"name": this.channel}
                },
                function (err, response, body) {
                    if (this._isStopped) {
                        return;
                    }
                    if (err || response.statusCode !== 200) {
                        return reject("Не удалось получить идентификатор канала.");
                    }
                    fulfill(body.id);
                }.bind(this)
            );
        }.bind(this));
    }
    
    _getSmiles () {
        return new Promise(function (fulfill, reject) {
            this._request({
                    method: "POST",
                    url: this._API_URL + "/api/smile",
                    json: true,
                    body: {"channel": this.channel}
                },
                function (err, response, body) {
                    if (this._isStopped) {
                        return;
                    }
                    if (err || response.statusCode !== 200) {
                        return reject("Не удалось получить список смайлов.");
                    }
                    fulfill(body);
                }.bind(this)
            );
        }.bind(this));
    }
    
    _flattenSmiles (smiles) {
        var flattenedSmiles = [];
        for (var iTab = 0; iTab < smiles.length; ++iTab) {
            flattenedSmiles = flattenedSmiles.concat(smiles[iTab]);
        }
        return flattenedSmiles;
    }
    
    _connect () {
        var io = require('socket.io-client');
        this._socket = io('wss://chat.peka2.tv', {
            transports: ['websocket'],
            'reconnect': true,
            'reconnectionDelay': 500,
            'reconnectionDelayMax': 2000,
            'reconnectionAttempts': Infinity
        });
    
        this._socket.on('connect', function () {
            if (this._token) {
                this._socket.emit('/chat/login', { token: this._token});
            }
            this._socket.emit('/chat/join', {channel: "stream/" + this._channelId}, function () {
                this._socket.emit('/chat/history',
                    {"channel":"stream/"+this._channelId, "amount":20,"query":{"conditions":[],"groups":[],"glue":"and"}},
                    function (data) {
                        for (var iMessage = data.result.length - 1; iMessage >= 0 ; --iMessage) {
                            this._processMessage(data.result[iMessage]);
                        }
                    }.bind(this)
                );
            }.bind(this));
        }.bind(this));
        this._socket.on('/chat/message', function(data) {
            this._processMessage(data);
        }.bind(this));
        this._socket.on('connect_error', function(error) {
            console.log('Funstream.tv connection error: ' + error);
        });
    
        this._socket.on('reconnect', function() {
            console.log('Funstream.tv reconnection');
        });
    }
    
    _processMessage (message) {
        if (this._receivedMessageIds.has(message.id)) {
            return;
        }
        this._receivedMessageIds.add(message.id);
    
        var chatMessage = new Message();
        chatMessage.id = message.id;
        var messageText = (message.to != null ? "[b]" + message.to.name + "[/b], " : "") + message.text;
        chatMessage.message = this._htmlify(messageText);
        chatMessage.nickname = message.from.name;
        this._usersIdentifiers[message.from.name] = message.from.id;
        chatMessage.time = new Date(message.time * 1000);
        var streamerName = this._streamerName || this.channel;
        var donate = message.type === "donate" || message.type === "fastdonate";
        if (donate) {
            chatMessage.rankId = "donation";
        }
        chatMessage.isPersonal = donate || (message.to !== null && message.to.name === streamerName);
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _bbCodeToHtml (str) {
        str = str.replace(this._bbCodeURLWithTextPattern, this._bbCodeURLToHtml);
        str = str.replace(this._bbCodeURLPattern, this._bbCodeURLToHtml);
        str = str.replace(this._bbCodeBoldPattern, '<strong>$1</strong>');
        return str;
    }
    
    _bbCodeURLToHtml (str, proto, url, host, port, path, query, fragment, text) {
        url = url.replace(/:s:/gi, ':%73:');
        if (!text) {
            text = url;
        }
        if (text.length <= 60) {
            return '<a rel="nofollow" href="' + proto + url + '" title="' + proto + url + '" target="_blank">' + text + '</a>';
        } else {
            length = text.length;
            return '<a rel="nofollow" href="' + proto + url + '" target="_blank" title="' + proto + url + '">' + text.substring(0, 30) + '...' + text.substring(length - 20) + '</a>';
        }
    }
    
    _escapeHtml (text) {
        return text.replace(/[\"&<>]/g, a => this._escapeCharMap[a]);
    }
    
    _htmlify (message) {
        message = this._escapeHtml(message);
        message = this._bbCodeToHtml(message);
        for (var iSmile = 0; iSmile < this._smiles.length; ++iSmile) {
            var smile = this._smiles[iSmile];
            message = message.replace(
                ":" + smile.code + ":",
                '<img class="chat-smile" src="' +smile.url + '" width="' + smile.width + '" height="' + smile.height + '" title="' + smile.code + '"/>');
        }
        return message;
    }
}