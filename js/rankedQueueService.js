var RankedQueueService = function(filename, appLifeCycleService, rankController, chatSource) {
    this._queuePath = filename;
    this._fs = require("fs");

    this._loadQueue(filename);
    this._appLifeCycleService = appLifeCycleService;
    this._appLifeCycleService.onClose(this._saveQueue.bind(this));
    setInterval(this._saveQueue.bind(this), this._queueSaveInterval);
    this._rankController = rankController;
    this._rankController.onRankUp(this._onRankUp.bind(this));
    this._chatSource = chatSource;
};

RankedQueueService.prototype.onupdate = null;

RankedQueueService.prototype.addUserToQueue = function(username) {
    var time = new Date();
    this._rankController.getRankId(username, function(rankId) {
        var user = new RankedQueueUser();
        user.username = username;
        user.rankId = rankId;
        user.time = time;
        this._addUser(user);
    }.bind(this));
};

RankedQueueService.prototype.popUser = function() {
    if (this._queue.length === 0) {
        return undefined;
    }
    var user = this._queue.shift();
    this._removedFromQueue.push(user);
    return user;
};

RankedQueueService.prototype.getUserPosition = function(username) {
    for (var queuePosition = 0; queuePosition < this._queue.length; ++queuePosition) {
        if (this._queue[queuePosition].username === username) {
            return queuePosition;
        }
    }
    return -1;
};

RankedQueueService.prototype.getQueue = function(username) {
    return this._queue;
};

RankedQueueService.prototype.getRemovedFromQueue = function(username) {
    return this._removedFromQueue;
};

RankedQueueService.prototype.clearQueue = function() {
    this._queue = [];
    this._removedFromQueue = [];
    this._saveQueue();
};

RankedQueueService.prototype._queue = null;
RankedQueueService.prototype._removedFromQueue = null;
RankedQueueService.prototype._isQueueChanged = false;
RankedQueueService.prototype._queueSaveInterval = 10000;
RankedQueueService.prototype._queuePath = null;
RankedQueueService.prototype._fs = null;
RankedQueueService.prototype._appLifeCycleService = null;
RankedQueueService.prototype._rankController = null;
RankedQueueService.prototype._chatSource = null;

RankedQueueService.prototype._compareUsers = function(firstUser, secondUser) {
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
    var secondRank = this._rankController.getRankById(second.rankId);
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
};

RankedQueueService.prototype._sortedIndex = function(value) {
    var low = 0,
        high = array.length;

    while (low < high) {
        var mid = (low + high) >>> 1;
        if (this._compareUsers(this._queue[mid], value) < 0) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
};

RankedQueueService.prototype._addUser = function (user) {
    this._queue.splice(this._sortedIndex(user), 0, user);
};


RankedQueueService.prototype._onRankUp = function (user) {
    var userPosition = this.getUserPosition(user.name);
    if (userPosition < 0) {
        return;
    }
    var queuedUser = this._queue.splice(userPosition, 1)[0];
    queuedUser.rankId = user.rankId;
    this._addUser(queuedUser);
};

RankedQueueService.prototype._saveQueue = function () {
    if (!this._isQueueChanged) {
        return;
    }
    var queueAndRemoved = {
        "queue": this._queue,
        "removedFromQueue": this._removedFromQueue
    };
    this._fs.writeFile(this._queuePath, JSON.stringify(queueAndRemoved, null, 2), function (err) {
        console.log("Unable to save ranked queue. " + err);
    });
};

RankedQueueService.prototype._loadQueue = function (filename) {
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
};
