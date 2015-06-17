var sc2tv = function(channel) {
    this.channel = channel;
    this._findChannelId(channel, function (channelId) {
        this._channelId = channelId;
        this._startChat();
    }.bind(this));
};

sc2tv.prototype.onMessage = null;
sc2tv.prototype.onStatusChange = null;
sc2tv.prototype.onUsersCountChange = null;

sc2tv.prototype.name = "sc2tv";
sc2tv.prototype.displayName = "Sc2tv.ru";
sc2tv.prototype.channel = null;

sc2tv.prototype.chatImage = "sc2tv.png";

sc2tv.prototype.getStatusImage = function (status) {

};

sc2tv.prototype.getSmileImage = function (status) {

};

sc2tv.prototype.stopChat = function () {
    this._stopChat();
};

sc2tv.prototype._CHAT_URL = 'http://chat.sc2tv.ru/';
sc2tv.prototype._CHANNEL_RETRY_INTERVAL = 10000;
sc2tv.prototype._CHAT_RELOAD_INTERVAL = 5000;

sc2tv.prototype._channelId = null;
sc2tv.prototype._chatTimerId = null;
sc2tv.prototype._channelTimerId = null;
sc2tv.prototype._isStopped = false;

sc2tv.prototype._findChannelId = function (url, onFound) {
    $.get(url).done( function ( data ) {
        if (this._isStopped) {
            return;
        }
        var chatIframeRegex = /channelId=[0-9]*&/;
        var matches = data.match(chatIframeRegex);
        if (matches.length == 0) {
            return;
        }
        var match = matches[0];
        match = match.substring(10, match.length - 1);
        if (typeof(onFound) === "function") {
            onFound(match);
        }
    }.bind(this)).fail( function () {
        if (this._isStopped) {
            return;
        }
        this._channelTimerId = setInterval(function() {
            this._findChannelId(url, onFound);
        }.bind(this), this._CHANNEL_RETRY_INTERVAL);
    }.bind(this));
};

sc2tv.prototype._startChat = function () {
    this._chatTimerId = setInterval(this._readChat.bind(this), this._CHAT_RELOAD_INTERVAL);
    this._readChat();
};

sc2tv.prototype._stopChat = function () {
    this._isStopped = true;
    clearInterval(this._chatTimerId);
    clearInterval(this._channelTimerId);
};

sc2tv.prototype._readChat = function () {
    $.ajaxSetup({
        ifModified: true,
        cache: true
    });
    $.getJSON(this._CHAT_URL + 'memfs/channel-' + this._channelId + '.json', function(jsonData) {
        if (this._isStopped) {
            return;
        }
        if (jsonData === undefined) {
            return;
        }
        var jsonMessages = jsonData.messages;
        for (var i = jsonMessages.length - 1; i >=0; --i) {
            var chatMessage = new Message();
            chatMessage.message = jsonMessages[i].message;
            chatMessage.nickname = jsonMessages[i].name;
            chatMessage.id = jsonMessages[i].id;
            chatMessage.time = new Date(jsonMessages[i].date);
            chatMessage.channel = this.channel;
            if (typeof(this.onMessage) === "function") {
                this.onMessage(this, chatMessage);
            }
        }
    }.bind(this));
};
