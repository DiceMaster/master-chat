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
    var channels = this._configSource.getChannels();
    for (var iChat = 0; iChat < channels.length; ++iChat) {
        var chatDesc = channels[iChat];
        var chat = eval("new " + chatDesc.type + "('" + chatDesc.channelId + "')");
        chat.onMessage = this._onMessage.bind(this);
        this._chats[this._fullChannelId(chat.name, chatDesc.channelId)] = chat;
    }
};

ChatSource.prototype._fullChannelId = function (chatName, channelName) {
    return chatName + "_" + channelName;
};

ChatSource.prototype._rankUp = function (user) {
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
    message.chat = chat.name;
    message.channel = chat.channel;
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

    if (message.rankId !== undefined) {
        this._addMessage(message, message.rankId);
        this._messageQueue.shift();
        this._processMessageQueue();
        return;
    }

    var lastMessageTime = this._configSource.getChannelLastMessageTime(message.chat, message.channel);
    if (message.time <= lastMessageTime) {
        this._rankController.getRankId(message.nickname, function (rankId) {
            this._addMessage(message, rankId);
            this._messageQueue.shift();
            this._processMessageQueue();
        }.bind(this));
        return;
    } else {
        this._configSource.setChannelLastMessageTime(message.chat, message.channel, message.time);
    }

    this._rankController.processMessage(message, {}, function (isRankUp, user) {
        if (isRankUp) {
            this._rankUp(user);
        }
        this._addMessage(message, user.rankId);
        this._messageQueue.shift();
        this._processMessageQueue();
    }.bind(this));
};

ChatSource.prototype._addMessage = function (message, rankId) {
    if (rankId === undefined) {
        rankId = this._configSource.getDefaultRankId();
    }
    var chat = this._chats[this._fullChannelId(message.chat, message.channel)];
    var rank = this._rankController.getRankById(rankId);
    if (rank === undefined) {
        rank = this._getChannelSpecialRank(chat, rankId);
    }
    message.rankIcon = rank.icon;
    message.rankTitle = rank.title;

    message.chatLogo = chat.chatImage;
    this._messages.push(message);

    if (typeof(this.onmessage) === "function") {
        this.onmessage(message);
    }
};

ChatSource.prototype._getChannelSpecialRank = function(chatChannel, rankId) {
    var channelRanks = chatChannel.specialRanks;
    if (channelRanks === undefined) {
        return undefined;
    }
    return channelRanks[rankId];
};