import {Message} from '/src/js/model/message.js';

export class MessageService {
    constructor (channelService, rankController, configService) {
        this._channelService = channelService;
        this._channelService.addMessageListener(this._onMessage.bind(this));

        this._rankController = rankController;

        this._rankControllerInitialized = false;

        this._configService = configService;

        this._messages = [];
        this._messageQueue = [];
        this._messageListeners = [];

        this._specialRanks = {
            "donation": {
                "exp": -1,
                "icon": "../../img/donation.png",
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

            this._rankControllerInitialized = true;
            this._processMessageQueue();
        }.bind(this));
    }

    addMessageListener (listener) {
        this._messageListeners.push(listener);
    }
    
    removeMessageListener (listener) {
        var index = this._messageListeners.indexOf(listener);
        if (index < 0) {
            return;
        }
        this._messageListeners.splice(index, 1);
    }

    postMessage (message, to, chatType, channel) {
        if (!this._channelService.postMessage(message, to, chatType, channel)) {
            // TODO: Show the message in the chat window it is not possible to post in original chat
        }
    }
    
    _notifyListeners  (message) {
        for (let listener of this._messageListeners) {
            listener(message);
        }
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
    
    _onMessage (message) {
        var shouldProcessQueue = this._rankControllerInitialized && this._messageQueue.length === 0;

        this._messageQueue.push(message);
        if (shouldProcessQueue) {
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

        var lastMessageTime = this._configService.getChannelLastMessageTime(message.chat, message.channel);
        message.isFresh = !message.time || message.time > lastMessageTime;
        
        if (message.isFresh) {
            if (message.time) {
                this._configService.setChannelLastMessageTime(message.chat, message.channel, message.time);
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
                var rankId = user && user.rankId ? user.rankId : this._rankController.getDefaultRankId();
                this._addMessage(message, rankId);
                this._messageQueue.shift();
                this._processMessageQueue();
            }.bind(this));
        }
    }
    
    _addMessage  (message, rankId) {
        if (rankId === undefined) {
            rankId = this._rankController.getDefaultRankId();
        }
        
        var rank = this._rankController.getRankById(rankId);
        if (rank === undefined) {
            rank = this._specialRanks[rankId];
        }

        if (rank) {
            message.rankId = rankId;
            message.rankIcon = rank.icon;
            message.rankTitle = rank.title;    
        }

        let chatLogoClass = this._channelService.getChatLogoClass(message.chat, message.channel);
        if (chatLogoClass) {
            message.chatLogo = chatLogoClass;
        }

        this._messages.push(message);
    
        this._notifyListeners(message);
    }    
}
