var CommandController = function(chatSource, rankController) {
    this._chatSource = chatSource;
    this._rankController = rankController;
    this._chatSource.addMessageListener(this._onMessage.bind(this));
};

CommandController.prototype._onMessage = function(message){
    if (!message.isFresh) {
        return;
    }
    if (message.message.indexOf("!") !== 0) {
        return;
    }
    var twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    if (message.time < twoHoursAgo) {
        return;
    }
    if (message.message.indexOf("!exp") === 0) {
        this._tellUserRank(message.nickname, message.chat, message.channel);
        return;
    }
};

CommandController.prototype._tellUserRank = function(user, chat, channel) {
    this._rankController.getUserRankAndExp(user, function (userInfo) {
        var rank = this._rankController.getRankById(userInfo.rankId);
        var nextRankId = this._rankController.getNextRank(userInfo.rankId);
        var nextRankExp = this._rankController.getRankById(nextRankId).exp;
        var exp = Math.floor(userInfo.exp / 10);
        var message = "Ранг " + rank.title + ", всего опыта: " + exp;
        if (rank.exp >= 0) {
            if (nextRankId === userInfo.rankId) {
                message += ". Достигнут максимальный уровень";
            } else {
                var nextExp = Math.ceil((nextRankExp - userInfo.exp) / 10);
                message += ". До следующего уровня " + nextExp + " опыта.";
            }
        }
        this._chatSource.postMessage(message, user, chat, channel);
    }.bind(this));
};

CommandController.prototype._chatSource = null;
CommandController.prototype._rankController = null;
