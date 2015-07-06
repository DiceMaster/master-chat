var RankController = function(configSource) {
    this._configSource = configSource;
    this._sortedRanks = this._sortedRanks(this._configSource.getRanks());
    var Datastore = require('nedb');
    this._db = new Datastore({
        filename: 'ranks.db',
        autoload: true
    });
    this._db.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
        if (err) {
            alert("Can't create indexes");
        }
    });

    this._importUsers();
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

RankController.prototype._importUsers = function () {
    var usersFileName = "ranks.json";
    var conversionFileName = "ranksToNewRanks.json";
    var fs = require("fs");
    if (!fs.existsSync(usersFileName)) {
        return;
    }
    if (!fs.existsSync(conversionFileName)) {
        return;
    }
    var usersData = fs.readFileSync(usersFileName);
    var importedUsers = JSON.parse(usersData);
    var conversionData = fs.readFileSync(conversionFileName);
    var rankToNewRank = JSON.parse(conversionData);

    var usersPerLevel = {};
    var maxExp = 0;
    var maxExpName = null;
    importedUsers.forEach( function( user )
    {
        usersPerLevel[user.level] = usersPerLevel[user.level] || 0;
        usersPerLevel[user.level]++;
        if (user.exp > maxExp) {
            maxExp = user.exp;
            maxExpName = user.name;
        }

        // Conversion
        var name = user.name;
        user.name = user.name.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
        user.name = user.name.trim();
        if (user.name.length == 0) {
            console.log(name);
            return;
        }

        var convertedRankId = rankToNewRank[user.level];
        var convertedRank = this._configSource.getRanks()[convertedRankId];
        var convertedExp = user.exp > convertedRank.exp ? convertedRank.exp : user.exp;

        var convertedUser = new User();
        convertedUser.name = user.name;
        convertedUser.rankId = convertedRankId;
        convertedUser.exp = convertedExp;

        this._db.update({ name: user.name }, convertedUser, { upsert: true }, function (err, numReplaced, upsert) {

        });
    }.bind(this));
    var ranksStats = {
        "usersCount": importedUsers.length,
        "hightestRank": {
            "name": maxExpName,
            "exp": maxExp
        },
        "usersPerLevel": usersPerLevel
    };
    console.log(JSON.stringify(ranksStats, null, 2));
};