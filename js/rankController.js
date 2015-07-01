var RankController = function(configSource) {
    this._configSource = configSource;
    this._sortedRanks = this._sortedRanks(this._configSource.getRanks());
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

RankController.prototype.processMessage = function (message, options, callback) {
    var expGain;
    if (options.firstMessage) {
        expGain = this._configSource.getFirstMessageExperience();
    } else if (options.smileOnly) {
        expGain = this._configSource.getSmileExperience();
    } else {
        expGain = this._configSource.getMessageExperience();
    }
    this._db.update({ name: message.nickname }, { $inc: { exp: expGain } }, { upsert: true });
    this._db.find({ name: message.nickname }, function (err, users) {
        if (err || users === undefined || users.length < 1) {
            return;
        }
        var user = users[0];
        var rankChanged = this._updateRank(user);
        callback(rankChanged, user);
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
    return this._configSource.getRanks()[rankId];
};

RankController.prototype._configSource = null;
RankController.prototype._db = null;
RankController.prototype._sortedRanks = null;

RankController.prototype._updateRank = function (user) {
    var newRankId = this._getNextRank(user.rankId, user.exp);
    if (newRankId !== user.rankId) {
        user.rankId = newRankId;
        this._db.update({ name: user.name }, { $set: { rankId: user.rankId } }, {});
        return user.rankId !== this._configSource.getDefaultRankId();
    }
    return false;
};

RankController.prototype._sortedRanks = function(ranks) {
    var unsortedRanks = [];
    var rankIds = Object.keys(ranks);
    rankIds.forEach(function(rankId, index) {
        var rank = ranks[rankId];
        var rankCopy = {
            "exp": rank.exp,
            "icon": rank.icon,
            "title": rank.title
        };
        rankCopy.id = rankId;
        unsortedRanks.push(rankCopy);
    });
    var sortedRanks = unsortedRanks.sort(function(a, b) {
        return a.exp - b.exp;
    });
    return sortedRanks;
};

RankController.prototype._getNextRank = function (currentRankId, exp) {
    if (currentRankId !== undefined) {
        if (this._configSource.getRanks()[currentRankId].exp < 0) {
            return currentRankId;
        }
        if (this._configSource.getRanks()[currentRankId].exp > exp) {
            exp = this._configSource.getRanks()[currentRankId].exp;
        }
    }
    var iRank;
    for (iRank = 0; iRank < this._sortedRanks.length - 1; ++iRank) {
        if (this._sortedRanks[iRank].exp > exp) {
            break;
        }
    }

    if (iRank > 0) {
        return this._sortedRanks[iRank - 1].id;
    } else {
        return undefined;
    }
};