class ChatSource {
    constructor (configSource, rankController) {
        this._configSource = configSource;
        this._rankController = rankController;

        this._chats = {};
        this._messages = [];
        this._messageQueue = [];
        this._listeners = [];
        this._specialRanks = {
            "donation": {
                "exp": -1,
                "icon": "img/donation.png",
                "title": "Donation"
            }
        };

        this._rankController.onLoad(function(err) {
            if (err) {
                console.log(err);
                var errorMessage = new Message();
                errorMessage.message = 'Failed to initialize the database.';
                errorMessage.isError = true;
                this._addMessage(errorMessage);
                return;
            }

            this._initializeChats();
        }.bind(this));
    }

    addMessageListener (listener) {
        this._listeners.push(listener);
    }
    
    removeMessageListener (listener) {
        var index = this._listeners.indexOf(listener);
        if (index < 0) {
            return;
        }
        this._listeners.splice(index, 1);
    }
    
    postMessage (message, to, chat, channel) {
        var chat = this._chats[this._fullChannelId(chat, channel)];
        if (typeof chat.postMessage === "function") {
            chat.postMessage(message, to);
        } else {
            // TODO: Show message in chat window it is not possible to post in original chat
        }
    }
    
    _initializeChats  () {
        var channels = this._configSource.getChannels();
        for (var iChat = 0; iChat < channels.length; ++iChat) {
            var chatDesc = channels[iChat];
            var parameters = "'" + chatDesc.channelId + "'";
            if (typeof chatDesc.username === "string") {
                parameters += ", '" + chatDesc.username + "'";
            }
            if (typeof chatDesc.password === "string") {
                parameters += ", '" + chatDesc.password + "'";
            }
            var chat = eval("new " + chatDesc.type + "(" + parameters + ")");
            chat.onMessage = this._onMessage.bind(this);
            this._chats[this._fullChannelId(chat.name, chatDesc.channelId)] = chat;
        }
    }
    
    _notifyListeners  (message) {
        for (var iListener = 0; iListener < this._listeners.length; ++iListener) {
            this._listeners[iListener](message);
        }
    }
    
    _fullChannelId  (chatName, channelName) {
        return chatName + "_" + channelName;
    }
    
    _rankUp  (user) {
        var systemMessage = new Message();
        systemMessage.isSystem = true;
        var newRank = this._rankController.getRankById(user.rankId);
        systemMessage.message = "Пользователь " + user.name + " получил звание " + newRank.title;
        this._notifyListeners(systemMessage);
    }
    
    _isMessageOutdated  (message) {
        if (!message.time) {
            return false;
        }

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
    }
    
    _onMessage (chat, message) {
        var messageQueueWasEmpty = this._messageQueue.length === 0;
        message.chat = chat.name;
        message.channel = chat.channel;
        this._messageQueue.push(message);
        if (messageQueueWasEmpty) {
            this._processMessageQueue();
        }
    }
    
    _processMessageQueue  () {
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
        message.isFresh = !message.time || message.time > lastMessageTime;
        if (message.isFresh) {
            if (message.time) {
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
        } else {
            this._rankController.getUserRankAndExp(message.nickname, function (user) {
                var rankId = user && user.rankId ? user.rankId : this._configSource.getDefaultRankId();
                this._addMessage(message, rankId);
                this._messageQueue.shift();
                this._processMessageQueue();
            }.bind(this));
        }
    }
    
    _addMessage  (message, rankId) {
        if (rankId === undefined) {
            rankId = this._configSource.getDefaultRankId();
        }
        var chat = this._chats[this._fullChannelId(message.chat, message.channel)];
        var rank = this._rankController.getRankById(rankId);
        if (rank === undefined) {
            rank = this._specialRanks[rankId];
        }

        if (rank) {
            message.rankId = rankId;
            message.rankIcon = rank.icon;
            message.rankTitle = rank.title;    
        }
    
        if (chat) {
            message.chatLogo = chat.chatLogoClass;
        }

        this._messages.push(message);
    
        this._notifyListeners(message);
    }    
}
