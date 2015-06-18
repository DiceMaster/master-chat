var gg = function(channel) {
    this.channel = channel;
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

gg.prototype.chatImage = "gg.png";

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
    chatMessage.message = message.text;
    chatMessage.nickname = message.user_name;
    chatMessage.id = message.message_id;
    chatMessage.time = new Date(message.timestamp * 1000);
    chatMessage.chat = this.name;
    chatMessage.channel = this.channel;
    chatMessage.isPersonal = message.text.indexOf(this.channel + ",") === 0;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, chatMessage);
    }
};

