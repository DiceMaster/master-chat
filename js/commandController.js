var CommandController = function(chatSource, rankController) {
    this._chatSource = chatSource;
    this._rankController = rankController;
    this._chatSource.addMessageListener(this._onMessage.bind(this));
};

CommandController.prototype._onMessage = function(message){
    if (message.message.indexOf("!") !== 0) {
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
        var exp = Math.floor(userInfo.exp / 10);
        this._chatSource.postMessage("Ранг " + rank.title + ", всего опыта: " + exp, user, chat, channel);
    }.bind(this));
};

CommandController.prototype._chatSource = null;
CommandController.prototype._rankController = null;
