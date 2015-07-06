var ConfigSource = function(filename, appLifeCycleService) {
    this._configPath = filename;
    this._fs = require("fs");

    this._config = this._loadConfig(filename);
    this._appLifeCycleService = appLifeCycleService;
    this._appLifeCycleService.onClose(this._saveConfig.bind(this));
    setInterval(this._saveConfig.bind(this), this._configSaveInterval);
};

ConfigSource.prototype.getChannels = function () {
    return this._config.channels || [];
};

ConfigSource.prototype.addChannel = function (type, channelId) {
    var iChannel = this._getChannelIndex(type, channelId);
    if (iChannel >= 0) {
        return;
    }
    this._config.channels = this._config.channels || [];
    var newChannel = new Channel(type, channelId);
    this._config.channels.push(newChannel);
    this._isConfigChanged = true;
};

ConfigSource.prototype.removeChannel = function (type, channelId) {
    var iChannel = this._getChannelIndex(type, channelId);
    if (iChannel < 0) {
        return;
    }
    this._config.channels.splice(iChannel, 1);
    this._isConfigChanged = true;
};

ConfigSource.prototype.getChannelLastMessageTime = function (type, channelId) {
    var iChannel = this._getChannelIndex(type, channelId);
    if (iChannel < 0) {
        return new Date(0);
    }
    return this._config.channels[iChannel].lastMessageTime;
};

ConfigSource.prototype.setChannelLastMessageTime = function (type, channelId, lastMessageTime) {
    var iChannel = this._getChannelIndex(type, channelId);
    if (iChannel < 0) {
        return;
    }
    this._config.channels[iChannel].lastMessageTime = lastMessageTime;
    this._isConfigChanged = true;
};

ConfigSource.prototype.getRanks = function () {
    return this._config.experience.ranks || {};
};


ConfigSource.prototype.getDefaultRankId = function () {
    return this._config.experience.defaultRankId;
};

ConfigSource.prototype.getMessageExperience = function () {
    return this._config.experience.message;
};

ConfigSource.prototype.getSmileExperience = function () {
    return this._config.experience.smile;
};
ConfigSource.prototype.getFirstMessageExperience = function () {
    return this._config.experience.firstMessage;
};

ConfigSource.prototype._config = null;
ConfigSource.prototype._isConfigChanged = false;
ConfigSource.prototype._configSaveInterval = 10000;
ConfigSource.prototype._configPath = null;
ConfigSource.prototype._fs = null;
ConfigSource.prototype._appLifeCycleService = null;

ConfigSource.prototype._getChannelIndex = function (type, channelId) {
    var channels = this._config.channels || [];
    for (var iChannel = 0; iChannel < channels.length; ++iChannel) {
        if (channels[iChannel].type === type &&
            channels[iChannel].channelId === channelId) {
            return iChannel;
        }
    }
    return -1;
};

ConfigSource.prototype._saveConfig = function () {
    if (!this._isConfigChanged) {
        return;
    }
    this._fs.writeFile(this._configPath, JSON.stringify(this._config, null, 2), function (err) {
        if (err) {
            throw err;
        }
    });
};

ConfigSource.prototype._loadConfig = function (filename) {
    var data = this._fs.readFileSync(filename);
    var config = JSON.parse(data);
    if (typeof(config.channels) === "undefined" ) {
        return config;
    }
    for (var iChannel = 0; iChannel < config.channels.length; iChannel++) {
        if (typeof(config.channels[iChannel].lastMessageTime) === "undefined") {
            continue;
        }
        config.channels[iChannel].lastMessageTime = new Date(config.channels[iChannel].lastMessageTime);
    }
    return config;
};
