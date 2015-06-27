var ChatSource = function(configSource, rankController) {
    this._chats = {};
    this._messages = [];
    this._messageQueue = [];
    this._configSource = configSource;
    this._rankController = rankController;
    this._initialize();
};

ChatSource.prototype.onmessage = null;

ChatSource.prototype._configSource = null;
ChatSource.prototype._rankController = null;

ChatSource.prototype._initialize = function () {
    for (var iChat = 0; iChat < this._configSource.config.channels.length; ++iChat) {
        var chatDesc = this._configSource.config.channels[iChat];
        var chat = eval("new " + chatDesc.type + "('" + chatDesc.channelId + "')");
        chat.onMessage = this._onMessage.bind(this);
        this._chats[chat.name] = chat;
    }
};

ChatSource.prototype._onRankUp = function (user) {
    var systemMessage = new Message();
    systemMessage.isSystem = true;
    var newRank = this._rankController.getRankById(user.rankId);
    systemMessage.message = "Пользователь " + user.name + " получил звание " + newRank.title;
    if (typeof(this.onmessage) === "function") {
        this.onmessage(systemMessage);
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

ChatSource.prototype._messageQueue = null;

ChatSource.prototype._onMessage = function (chat, message) {
    var messageQueueWasEmpty = this._messageQueue.length === 0;
    this._messageQueue.push(message);
    if (messageQueueWasEmpty) {
        this._processMessageQueue();
    }
};

ChatSource.prototype._processMessageQueue = function () {
    if (this._messageQueue.length === 0) {
        return;
    }

    var message = this._messageQueue[0];

    if (this._isMessageOutdated(message)) {
        this._messageQueue.shift();
        this._processMessageQueue();
        return;
    }

    this._rankController.processMessage(message, {}, function (isRankUp, user) {
        if (isRankUp) {
            this._onRankUp(user);
        }

        message.chatLogo = this._chats[message.chat].chatImage;
        if (user.rankId === undefined) {
            user.rankId = this._configSource.config.experience.defaultRankId;
        }

        var rank = this._rankController.getRankById(user.rankId);
        message.rankIcon = rank.icon;
        message.rankTitle = rank.title;
        this._messages.push(message);

        if (typeof(this.onmessage) === "function") {
            this.onmessage(message);
        }
        this._messageQueue.shift();
        this._processMessageQueue();
    }.bind(this));
};
