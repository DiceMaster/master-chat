var RankController = function(configSource) {
    this._configSource = configSource;
    var Datastore = require('nedb')
        , path = require('path');
    this._db = new Datastore({
        filename: path.join(require('nw.gui').App.dataPath, 'ranks.db'),
        autoload: true
    });
    this._db.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
        if (err) {
            alert("Can't create indexes");
        }
    });
};

RankController.prototype.onrankup = null;

RankController.prototype.processMessage = function (message) {
    var expGain = this._configSource.config.experience.message;
    this._db.update({ name: message.nickname }, { $inc: { exp: expGain } }, { upsert: true });
    this._db.find({ name: message.nickname }, function (err, users) {
        if (err) {
            return;
        }
        if (users === undefined || users.length < 1) {
            return;
        }
        var user = users[0];
        this._updateLevel(user);
    }.bind(this));
};

RankController.prototype.getRankId = function (username, callback) {
    this._db.find({ name: username }, function (err, users) {
        if (err) {
            callback(undefined);
            return;
        }
        if (users.length > 0) {
            callback(users[0].rankId);
            return;
        }
        callback(undefined);
    });
};


RankController.prototype.getRankById = function(rankId) {
    return this._configSource.config.experience.ranks[rankId];
};

RankController.prototype._updateLevel = function (user) {
    var newRankId = this._getNextRank(user.rankId, user.exp);
    if (newRankId !== user.rankId) {
        user.rankId = newRankId;
        this._db.update({ name: user.name }, { $set: { rankId: user.rankId } }, {}, function(err) {

        });
        if (typeof(this.onrankup) === "function") {
            this.onrankup(user);
        }
    }
};

RankController.prototype._configSource = null;
RankController.prototype._db = null;
RankController.prototype._getNextRank = function (currentLevel, exp) {
    var ranks = this._configSource.config.experience.ranks;
    var rankIds = Object.keys(ranks);
    var foundRank = undefined;
    rankIds.forEach(function(rankId, index) {
        if (index === rankIds.length - 1) {
            foundRank = rankId;
            return;
        }
        if (ranks[rankId].exp > exp) {
            foundRank = rankId;
            return;
        }
    });
    return foundRank;
};