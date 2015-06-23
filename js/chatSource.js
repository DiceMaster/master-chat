var ChatSource = function() {
    this._chats = {};
    this._messages = [];
    this._loadConfig();
    this._initialize();
};

ChatSource.prototype.onmessage = null;

ChatSource.prototype._config = {
    "channels": [
        {
            "type": "sc2tv",
            "channelId": "garklav"
        },
        {
            "type": "gg",
            "channelId": "Happa_"
        }
    ]
};

ChatSource.prototype._loadConfig = function () {

};

ChatSource.prototype._initialize = function () {
    for (var iChat = 0; iChat < this._config.channels.length; ++iChat) {
        var chatDesc = this._config.channels[iChat];
        var chat = eval("new " + chatDesc.type + "('" + chatDesc.channelId + "')");
        chat.onMessage = this._onMessage.bind(this);
        this._chats[chat.name] = chat;
    }
};

ChatSource.prototype._isMessageOutdated = function (message) {
    for (var iMessage = this._messages.length - 1; iMessage >= 0; --iMessage) {
        if (message.chat !== this._messages[iMessage].chat) {
            continue;
        }
        if (message.time < this._messages[iMessage].time) {
            return true;
        }
        if (message.nickname === this._messages[iMessage].nickname &&
            message.message === this._messages[iMessage].message &&
            message.time.getTime() === this._messages[iMessage].time.getTime()) {
            return true;
        }
    }

    return false;
};

ChatSource.prototype._onMessage = function (chat, message) {
    if (this._isMessageOutdated(message)) {
        return;
    }
    message.chatLogo = this._chats[message.chat].chatImage;
    this._messages.push(message);

    if (typeof(this.onmessage) === "function") {
        this.onmessage(message);
    }
};
