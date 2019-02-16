import {Channel} from '/src/js/model/channel.js';

export class ConfigService {
    constructor (filename, appLifeCycleService) {
        this._configPath = filename;
        this._fs = require("fs");

        this._DEFAULT_THEME = "default";

        this._config = this._loadConfig(filename);
        this._ranks = this._loadRanks("templates/" + this._config.theme + "/ranks.json");
        this._appLifeCycleService = appLifeCycleService;
        this._appLifeCycleService.onClose(this._saveConfig.bind(this));
        setInterval(this._saveConfig.bind(this), this._configSaveInterval);
    }

    getChannels () {
        return this._config.channels || [];
    }
    
    addChannel (type, channelId) {
        const iChannel = this._getChannelIndex(type, channelId);
        if (iChannel >= 0) {
            return;
        }
        this._config.channels = this._config.channels || [];
        const newChannel = new Channel(type, channelId);
        this._config.channels.push(newChannel);
        this._isConfigChanged = true;
    }
    
    removeChannel (type, channelId) {
        const iChannel = this._getChannelIndex(type, channelId);
        if (iChannel < 0) {
            return;
        }
        this._config.channels.splice(iChannel, 1);
        this._isConfigChanged = true;
    }
    
    getChannelLastMessageTime (type, channelId) {
        const iChannel = this._getChannelIndex(type, channelId);
        if (iChannel < 0) {
            return new Date(0);
        }
        return this._config.channels[iChannel].lastMessageTime;
    }
    
    setChannelLastMessageTime (type, channelId, lastMessageTime) {
        const iChannel = this._getChannelIndex(type, channelId);
        if (iChannel < 0) {
            return;
        }
        this._config.channels[iChannel].lastMessageTime = lastMessageTime;
        this._isConfigChanged = true;
    }
    
    getRanks () {
        return this._ranks || {};
    }
    
    getThemeName () {
        return this._config.theme;
    }
    
    _getChannelIndex (type, channelId) {
        const channels = this._config.channels || [];
        for (let iChannel = 0; iChannel < channels.length; ++iChannel) {
            if (channels[iChannel].type === type &&
                channels[iChannel].channelId === channelId) {
                return iChannel;
            }
        }
        return -1;
    }
    
    _saveConfig () {
        if (!this._isConfigChanged) {
            return;
        }
        this._fs.writeFile(this._configPath, JSON.stringify(this._config, null, 2), function (err) {
            if (err) {
                throw err;
            }
        });
    }
    
    _loadConfig (filename) {
        const data = this._fs.readFileSync(filename);
        const config = JSON.parse(data) || {};
        if (typeof(config.channels) !== "undefined" ) {
            for (let iChannel = 0; iChannel < config.channels.length; iChannel++) {
                if (typeof(config.channels[iChannel].lastMessageTime) === "undefined") {
                    continue;
                }
                config.channels[iChannel].lastMessageTime = new Date(config.channels[iChannel].lastMessageTime);
            }
        }
        if (typeof(config.theme) === "undefined") {
            config.theme = this._DEFAULT_THEME;
        }
        
        return config;
    }

    _loadRanks (filename) {
        const data = this._fs.readFileSync(filename);
        const ranks = JSON.parse(data);

        return ranks;
    }
}
