var ChatSource = function(configSource, rankController) {
    this._chats = {};
    this._messages = [];
    this._configSource = configSource;
    this._rankController = rankController;
    this._rankController.onrankup = this._onrankup.bind(this);
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

ChatSource.prototype._onrankup = function (user) {
    var systemMessage = new Message();
    systemMessage.isSystem = true;
    var newRank = this._rankController.getRankById(user.rankId);
    systemMessage.message = "Пользователь " + user.nickname + " получил звание " + newRank.title;
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

ChatSource.prototype._onMessage = function (chat, message) {
    if (this._isMessageOutdated(message)) {
        return;
    }

    this._rankController.processMessage(message);

    this._rankController.getRankId(message.nickname, function (rankId) {
        message.chatLogo = this._chats[message.chat].chatImage;
        if (rankId === undefined) {
            rankId = this._configSource.config.experience.defaultRankId;
        }

        message.rankIcon = this._rankController.getRankById(rankId).icon;
        this._messages.push(message);

        if (typeof(this.onmessage) === "function") {
            this.onmessage(message);
        }
    }.bind(this));
};
