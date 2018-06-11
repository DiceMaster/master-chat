class RankedQueueService {
    constructor (filename, appLifeCycleService, rankController, chatSource) {
        this._queuePath = filename;
        this._fs = require("fs");

        this._chatSource = chatSource;

        this._appLifeCycleService = appLifeCycleService;
        this._appLifeCycleService.onClose(this._saveQueue.bind(this));

        this._rankController = rankController;
        this._rankController.onRankUp(this._onRankUp.bind(this));

        this.onQueueUpdate = null;
        this.onRemovedFromQueueUpdate = null;
        this._isQueueChanged = false;
        this._queueSaveInterval = 10000;  

        this._loadQueue(filename);

        setInterval(this._saveQueue.bind(this), this._queueSaveInterval);
    }

    addUserToQueue (username, callback) {
        var time = new Date();
        this._rankController.getUserRankAndExp(username, function(userRankAndExp) {
            var user = new RankedQueueUser();
            user.username = username;
            user.rankId = userRankAndExp.rankId;
            user.time = time;
            var position = this._addUser(user);
            if (typeof callback === "function") {
                callback(position);
            }
        }.bind(this));
    };
    
    popUser () {
        if (this._queue.length === 0) {
            return undefined;
        }
        var user = this._queue.shift();
        this._removedFromQueue.push(user);
        this._isQueueChanged = true;
        return user;
    };
    
    getUserPosition (username) {
        for (var queuePosition = 0; queuePosition < this._queue.length; ++queuePosition) {
            if (this._queue[queuePosition].username === username) {
                return queuePosition;
            }
        }
        return -1;
    };
    
    getQueue (username) {
        return this._queue;
    };
    
    getRemovedFromQueue (username) {
        return this._removedFromQueue;
    };
    
    clearQueue () {
        this._queue = [];
        this._removedFromQueue = [];
        this._isQueueChanged = true;
        this._saveQueue();
    };
        
    _compareUsers (firstUser, secondUser) {
        if (firstUser.rankId === secondUser.rankId) {
            if (firstUser.time < secondUser.time) {
                return -1;
            }
            if (firstUser.time > secondUser.time) {
                return 1;
            }
            return 0;
        }
        var firstRank = this._rankController.getRankById(firstUser.rankId);
        var secondRank = this._rankController.getRankById(secondUser.rankId);
        if (firstRank.exp === secondRank.exp) {
            return 0;
        }
        if (firstRank.exp < 0) {
            return 1;
        }
        if (secondRank.exp > 0) {
            return -1;
        }
        return firstRank.exp - secondRank.exp;
    }
    
    _sortedIndex (value) {
        var low = 0,
            high = this._queue.length;
    
        while (low < high) {
            var mid = (low + high) >>> 1;
            if (this._compareUsers(this._queue[mid], value) < 0) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low;
    }
    
    _addUser  (user) {
        var insertionIndex = this._sortedIndex(user);
        this._queue.splice(insertionIndex, 0, user);
        this._isQueueChanged = true;
        if (typeof this.onQueueUpdate === "function") {
            this.onQueueUpdate(this);
        }
        return insertionIndex;
    }
    
    _onRankUp  (user) {
        var userPosition = this.getUserPosition(user.name);
        if (userPosition < 0) {
            return;
        }
        var queuedUser = this._queue.splice(userPosition, 1)[0];
        queuedUser.rankId = user.rankId;
        this._addUser(queuedUser);
    }
    
    _saveQueue  () {
        if (!this._isQueueChanged) {
            return;
        }
        var queueAndRemoved = {
            "queue": this._queue,
            "removedFromQueue": this._removedFromQueue
        };
        this._fs.writeFile(this._queuePath, JSON.stringify(queueAndRemoved, null, 2), function (err) {
            if (err) {
                return;
            }
            this._isQueueChanged = false;
        }.bind(this));
    }
    
    _loadQueue  (filename) {
        var data;
        try {
            data = this._fs.readFileSync(filename);
        } catch (err) {
            this._queue = [];
            this._removedFromQueue = [];
            return;
        }
        var jsonObject;
        try {
            jsonObject = JSON.parse(data);
        } catch (err) {
            this._queue = [];
            this._removedFromQueue = [];
            return;
        }
        var queue = jsonObject.queue || [];
        for (var i = 0; i < queue.length; ++i) {
            queue[i].time = new Date(queue[i].time);
        }
        this._queue = queue;
    
        var removedFromQueue = jsonObject.removedFromQueue || [];
        for (var i = 0; i < removedFromQueue.length; ++i) {
            removedFromQueue[i].time = new Date(queue[i].time);
        }
        this._removedFromQueue = removedFromQueue;
    }
}
