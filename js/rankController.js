import {User} from '/js/model/user.js';

export class RankController {
    constructor (configService) {
        this._configService = configService;
        this._rankUpHandlers = [];
        this._sortedRanks = this._sortRanks(this._configService.getRanks());
        const defaultRank = this._sortedRanks.find(rank => rank.exp >= 0);
        this._defaultRankId = defaultRank ? defaultRank.id : undefined;

        this._onLoadHandler = null;
        this._loaded = false;
        this._loadError = null;

        this._EXP_REGULAR = 10;
        this._EXP_FIRST_MSG = 50;
        this._EXP_SMILE = 5;

        const Datastore = require('nedb');
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
        let expGain;
        if (options.firstMessage) {
            expGain = this._EXP_FIRST_MSG;
        } else if (options.smileOnly) {
            expGain = this._EXP_SMILE;
        } else {
            expGain = this._EXP_REGULAR;
        }
        this._db.update({ name: message.nickname }, { $inc: { exp: expGain } }, { upsert: true });
        this._db.find({ name: message.nickname }, function (err, users) {
            if (err || users === undefined || users.length < 1) {
                console.log("Rank controller can't find user. Error = " + err);
                return;
            }
            const user = users[0];
            const rankChanged = this._updateRank(user);
            callback(rankChanged, user);
            if (rankChanged) {
                for (let iHandler = 0; iHandler < this._rankUpHandlers.length; ++iHandler) {
                    const handler = this._rankUpHandlers[iHandler];
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
            const user = new User();
            user.name = username;
            user.exp = 0;
            user.rankId = this._defaultRankId;
            callback(user);
        }.bind(this));
    }
    
    getRankById(rankId) {
        return this._configService.getRanks()[rankId];
    }

    getDefaultRankId () {
        return this._defaultRankId;
    }
    
    getNextRank (rankId) {
        if (rankId === undefined) {
            rankId = this._defaultRankId;
        }
        if (this._configService.getRanks()[rankId].exp < 0) {
            return rankId;
        }
        const exp = this._configService.getRanks()[rankId].exp;
        for (let iRank = 0; iRank < this._sortedRanks.length; ++iRank) {
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
        const newRankId = this._getNextRank(user.rankId, user.exp);
        if (newRankId !== user.rankId) {
            user.rankId = newRankId;
            this._db.update({ name: user.name }, { $set: { rankId: user.rankId } }, {});
            return user.rankId !== this._defaultRankId;
        }
        return false;
    }
    
    _sortRanks(ranks) {
        const unsortedRanks = [];
        const rankIds = Object.keys(ranks);
        rankIds.forEach(function(rankId, index) {
            const rank = ranks[rankId];
            const rankCopy = {
                "exp": rank.exp,
                "icon": rank.icon,
                "title": rank.title,
                "id": rankId
            };
            unsortedRanks.push(rankCopy);
        });
        const sortedRanks = unsortedRanks.sort(function(a, b) {
            return a.exp - b.exp;
        });
        return sortedRanks;
    }
    
    _getNextRank (currentRankId, exp) {
        if (currentRankId !== undefined) {
            if (this._configService.getRanks()[currentRankId].exp < 0) {
                return currentRankId;
            }
            if (this._configService.getRanks()[currentRankId].exp > exp) {
                exp = this._configService.getRanks()[currentRankId].exp;
            }
        }
        for (var iRank = 0; iRank < this._sortedRanks.length; ++iRank) {
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
