import {User} from '/js/model/user.js';

export class RankController {
    constructor (configSource) {
        this._configSource = configSource;
        this._rankUpHandlers = [];
        this._sortedRanks = this._sortedRanks(this._configSource.getRanks());

        this._onLoadHandler = null;
        this._loaded = false;
        this._loadError = null;

        var Datastore = require('nedb');
        this._db = new Datastore({
            filename: 'ranks.db'
        });
        this._db.loadDatabase(function (err) {
            if (err) {
                this._loaded = true;
                this._loadError = err;
                if (typeof this._onLoadHandler === 'function') {
                    this._onLoadHandler(err);
                }
                return;
            }

            this._db.ensureIndex({ fieldName: 'name', unique: true }, function (err) {
                this._loaded = true;
                this._loadError = err;
                if (typeof this._onLoadHandler === 'function') {
                    this._onLoadHandler(err);
                }
            }.bind(this));    
        }.bind(this));
    }

    onLoad (handler) {
        if (typeof handler !== 'function') {
            return;
        }

        this._onLoadHandler = handler;

        if (this._loaded) {
            setTimeout(function() {
                this._onLoadHandler(this._loadError);
            }.bind(this));
        }
    }

    processMessage (message, options, callback) {
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
            if (rankChanged) {
                for (var iHandler = 0; iHandler < this._rankUpHandlers.length; ++iHandler) {
                    var handler = this._rankUpHandlers[iHandler];
                    handler(user);
                }
            }
        }.bind(this));
    }
    
    getUserRankAndExp (username, callback) {
        this._db.find({ name: username }, function (err, users) {
            if (err) {
                callback(undefined);
                return;
            }
            if (users.length > 0) {
                callback(users[0]);
                return;
            }
            var user = new User();
            user.name = username;
            user.exp = 0;
            user.rankId = this._configSource.getDefaultRankId();
            callback(user);
        }.bind(this));
    }
    
    getRankById(rankId) {
        return this._configSource.getRanks()[rankId];
    }
    
    getNextRank (rankId) {
        if (rankId === undefined) {
            rankId = this._configSource.getDefaultRankId();
        }
        if (this._configSource.getRanks()[rankId].exp < 0) {
            return rankId;
        }
        var exp = this._configSource.getRanks()[rankId].exp;
        for (var iRank = 0; iRank < this._sortedRanks.length; ++iRank) {
            if (this._sortedRanks[iRank].exp > exp) {
                return this._sortedRanks[iRank].id;
            }
        }
        return rankId;
    }
    
    onRankUp(handler) {
        if (typeof handler !== "function") {
            return;
        }
        this._rankUpHandlers.push(handler);
    }
    
    _updateRank (user) {
        var newRankId = this._getNextRank(user.rankId, user.exp);
        if (newRankId !== user.rankId) {
            user.rankId = newRankId;
            this._db.update({ name: user.name }, { $set: { rankId: user.rankId } }, {});
            return user.rankId !== this._configSource.getDefaultRankId();
        }
        return false;
    }
    
    _sortedRanks(ranks) {
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
    }
    
    _getNextRank (currentRankId, exp) {
        if (currentRankId !== undefined) {
            if (this._configSource.getRanks()[currentRankId].exp < 0) {
                return currentRankId;
            }
            if (this._configSource.getRanks()[currentRankId].exp > exp) {
                exp = this._configSource.getRanks()[currentRankId].exp;
            }
        }
        var iRank;
        for (iRank = 0; iRank < this._sortedRanks.length; ++iRank) {
            if (this._sortedRanks[iRank].exp > exp) {
                break;
            }
        }
    
        if (iRank > 0) {
            return this._sortedRanks[iRank - 1].id;
        } else {
            return undefined;
        }
    }
}
