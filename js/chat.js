var Chat = function(view) {
    this._chats = [];
    this._messages = [];
    this._loadConfig();
    this._initialize(view);
};

Chat.prototype._config = {
    "channels": [
        {
            "type": "sc2tv",
            "channelId": "cah4ec"
        },
        {
            "type": "gg",
            "channelId": "Happa_"
        }
    ]
};

Chat.prototype._view = null;

Chat.prototype._loadConfig = function () {

};

Chat.prototype._initialize = function (view) {
    this._view = view;
    for (var iChat = 0; iChat < this._config.channels.length; ++iChat) {
        var chatDesc = this._config.channels[iChat];
        var chat = eval("new " + chatDesc.type + "('" + chatDesc.channelId + "')");
        chat.onMessage = this._onMessage.bind(this);
        this._chats.push(chat);
    }
};

Chat.prototype._isMessageOutdated = function (message) {
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

Chat.prototype._onMessage = function (chat, message) {
    if (this._isMessageOutdated(message)) {
        return;
    }
    this._messages.push(message);

    var isScrollAtBottom = this._view.scrollTop() + this._view.innerHeight() >= this._view.prop("scrollHeight");

    var messageClass = "";
    if (message.isPersonal) {
        messageClass += "message-to-user";
    }
    if (messageClass.length > 0) {
        this._view.append($("<li>" + message.chat + "| <span class='nick role-user'>" + message.nickname + ":</span> <span class='" + messageClass + "'>" + message.message + "</span></li>"));
    } else {
        this._view.append($("<li>" + message.chat + "| <span class='nick role-user'>" + message.nickname + ":</span> " + message.message + "</li>"));
    }
    if (isScrollAtBottom) {
        this._view.scrollTop(this._view.prop("scrollHeight"));
    }
};
