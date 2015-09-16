var funstream = function(channel, username, password) {
    this.channel = channel;
    this._username = username;
    this._password = password;
    this._request = require("request");
    this._promise = require("promise");
    this._smiles = [];

    this._promise.all([this._findChannelId(), this._getSmiles()])
        .then(function (results) {
                this._channelId = results[0];
                this._smiles = this._flattenSmiles(results[1]);
                this._connect();
            }.bind(this))
        .catch(function (err) {
                this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на sc2tv/funstream. " + err);
            }.bind(this));
};

funstream.prototype.onMessage = null;
funstream.prototype.onStatusChange = null;
funstream.prototype.onUsersCountChange = null;

funstream.prototype.name = "funstream";
funstream.prototype.displayName = "funstream.tv";
funstream.prototype.channel = null;

funstream.prototype.chatImage = "sc2tv_logo.png";

funstream.prototype.stopChat = function () {
    this._stopChat();
};

funstream.prototype._API_URL = "http://funstream.tv";
funstream.prototype._CHAT_URL = "http://funstream.tv:3811";
funstream.prototype._SMILE_URL = "http://funstream.tv/build/images/smiles/";
funstream.prototype._CHANNEL_RETRY_INTERVAL = 10000;
funstream.prototype._CHAT_RELOAD_INTERVAL = 5000;

funstream.prototype._isStopped = false;
funstream.prototype._channelId = null;
funstream.prototype._socket = null;
funstream.prototype._username = null;
funstream.prototype._password = null;
funstream.prototype._channelId = null;
funstream.prototype._request = null;
funstream.prototype._promise = null;
funstream.prototype._smiles = null;

funstream.prototype._fireErrorMessage = function (messageText) {
    var errorMessage = new Message();
    errorMessage.message = messageText;
    errorMessage.isError = true;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, errorMessage);
    }
};

funstream.prototype._stopChat = function () {
    this._isStopped = true;
    clearInterval(this._chatTimerId);
    clearTimeout(this._channelTimerId);
    clearTimeout(this._smileDefinitionUrlTimerId);
};

funstream.prototype._findChannelId = function() {
    return new this._promise(function (fulfill, reject) {
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
};

funstream.prototype._getSmiles = function() {
    return new this._promise(function (fulfill, reject) {
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
};

funstream.prototype._flattenSmiles = function(smiles) {
    var flattenedSmiles = [];
    for (var iTab = 0; iTab < smiles.length; ++iTab) {
        flattenedSmiles = flattenedSmiles.concat(smiles[iTab]);
    }
    return flattenedSmiles;
};

funstream.prototype._connect = function() {
    var io = require('socket.io-client');
    this._socket = io.connect('http://funstream.tv:3811', {transports: ['websocket']});

    this._socket.on('connect', function (data) {
        this._socket.emit('/chat/join', {channel: "stream/" + this._channelId}, function (data) {
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
};

funstream.prototype._processMessage = function(message) {
    var chatMessage = new Message();
    chatMessage.message = this._htmlify(message.text);
    chatMessage.nickname = message.from.name;
    chatMessage.id = message.id;
    chatMessage.time = new Date(message.time * 1000);
    var streamerName = this._streamerName || this.channel;
    var donate = message.type === "donate" || message.type === "fastdonate";
    if (donate) {
        chatMessage.rankId = "funstream_prime";
    }
    chatMessage.isPersonal = donate || (message.to !== null && message.to.name === streamerName);
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, chatMessage);
    }
};

funstream.prototype._URLPatternStr = '((?:(?:ht|f)tps?)(?:://))' + '(((?:(?:[a-z\u0430-\u0451\\d](?:[a-z\u0430-\u0451\\d-]*[a-z\u0430-\u0451\\d])*)\\.)+(?:[a-z]{2,}|\u0440\u0444)' + '|(?:(?:\\d{1,3}\\.){3}\\d{1,3}))' + '(:\\d+)?' + '(/[-a-z\u0430-\u0451\\d%_~\\+\\(\\):]*(?:[\\.,][-a-z\u0430-\u0451\\d%_~\\+\\(\\):]+)*)*' + '(\\?(?:&amp;|&quot;|&#039|[&"\'.:;a-z\u0430-\u0451\\d%_~\\+=-])*)?' + '(#(?:&amp;|&quot;|&#039|[\*!\(\)\/&"\'.:;a-z\u0430-\u0451\\d%_~\\+=-])*)?)';
funstream.prototype._bbCodeURLPattern = new RegExp('\\[url\\]' + sc2tv.prototype._URLPatternStr + '\\[\/url\\]()', 'gi');
funstream.prototype._bbCodeURLWithTextPattern = new RegExp('\\[url=' + sc2tv.prototype._URLPatternStr + '\\]([\u0020-\u007E\u0400-\u045F\u0490\u0491\u0207\u0239\u2012\u2013\u2014]+?)\\[\/url\\]', 'gi');
funstream.prototype._bbCodeBoldPattern = new RegExp('\\[b\\]([\\s\\S]+?)\\[/b\\]', 'gi');

funstream.prototype._bbCodeToHtml = function (str) {
    str = str.replace(this._bbCodeURLWithTextPattern, this._bbCodeURLToHtml);
    str = str.replace(this._bbCodeURLPattern, this._bbCodeURLToHtml);
    str = str.replace(this._bbCodeBoldPattern, '<strong>$1</strong>');
    return str;
};

funstream.prototype._bbCodeURLToHtml = function (str, proto, url, host, port, path, query, fragment, text) {
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
};

funstream.prototype._htmlify = function (message) {
    message = this._bbCodeToHtml(message);
    for (var iSmile = 0; iSmile < this._smiles.length; ++iSmile) {
        var smile = this._smiles[iSmile];
        message = message.replace(
            ":" + smile.code + ":",
            '<img src="' + this._SMILE_URL + smile.image + '" width="' + smile.width + '" height="' + smile.height + '"/>');
    }
    return message;
};
