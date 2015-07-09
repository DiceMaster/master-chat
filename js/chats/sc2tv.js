var sc2tv = function(channel) {
    this._smileHtmlReplacement = [];
    this.channel = channel;
    this._findChannelId(this._CHANNEL_URL + channel, function (channelId) {
        if (channelId === undefined) {
            this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на Sc2tv. Не удается получить числовой идентификатор канала.");
            return;
        }
        this._channelId = channelId;
        this._findSmilesDefinitionUrl(this._CHAT_URL + "index.htm?channelId=" + this._channelId, function (smileDefinitionUrl){
            if (smileDefinitionUrl === undefined) {
                this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на Sc2tv. Не удается получить адрес списка смайлов.");
                return;
            }
            this._loadSmilesDefinition(this._CHAT_URL + smileDefinitionUrl, function (smileDefinition) {
                if (smileDefinition === undefined) {
                    this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на Sc2tv. Не удается получить список поддерживаемых смайлов.");
                    return;
                }
                this._smileDefinition = smileDefinition;
                this._buildSmilesReplacement(smileDefinition);
                this._startChat();
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

sc2tv.prototype.onMessage = null;
sc2tv.prototype.onStatusChange = null;
sc2tv.prototype.onUsersCountChange = null;

sc2tv.prototype.name = "sc2tv";
sc2tv.prototype.displayName = "Sc2tv.ru";
sc2tv.prototype.channel = null;

sc2tv.prototype.chatImage = "sc2tv_logo.png";

sc2tv.prototype.stopChat = function () {
    this._stopChat();
};

sc2tv.prototype._CHAT_URL = "http://chat.sc2tv.ru/";
sc2tv.prototype._CHANNEL_URL = "http://sc2tv.ru/channel/";
sc2tv.prototype._CHANNEL_RETRY_INTERVAL = 10000;
sc2tv.prototype._CHAT_RELOAD_INTERVAL = 5000;

sc2tv.prototype._channelId = null;
sc2tv.prototype._chatTimerId = null;
sc2tv.prototype._isStopped = false;

sc2tv.prototype._fireErrorMessage = function (messageText) {
    var errorMessage = new Message();
    errorMessage.message = messageText;
    errorMessage.isError;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, errorMessage);
    }
};

sc2tv.prototype._findChannelId = function (url, onFound) {
    $.get(url).done( function ( data ) {
        if (this._isStopped) {
            return;
        }
        var channelIdMatch = data.match(/channelId=([0-9]*)&/);
        if (channelIdMatch === null) {
            if (typeof(onFound) === "function") {
                onFound(undefined);
            }
            return;
        }
        if (typeof(onFound) === "function") {
            onFound(channelIdMatch[1]);
        }
    }.bind(this)).fail( function () {
        if (this._isStopped) {
            return;
        }
        if (typeof(onFound) === "function") {
            onFound(undefined);
        }
    }.bind(this));
};

sc2tv.prototype._findSmilesDefinitionUrl = function(url, onLoad) {
    $.get(url).done( function ( data ) {
        if (this._isStopped) {
            return;
        }
        var smileDefinitionUrlMatch = data.match(/src="(js\/smiles.js\?v=[0-9]*)">/);
        if (smileDefinitionUrlMatch === null) {
            if (typeof(onLoad) === "function") {
                onLoad(undefined);
            }
            return;
        }
        if (typeof(onLoad) === "function") {
            onLoad(smileDefinitionUrlMatch[1]);
        }
    }.bind(this)).fail( function () {
        if (this._isStopped) {
            return;
        }
        if (typeof(onLoad) === "function") {
            onLoad(undefined);
        }
    }.bind(this));
};

sc2tv.prototype._loadSmilesDefinition = function(url, onLoad) {
    $.get(url).done( function ( data ) {
        if (this._isStopped) {
            return;
        }
        var smileDefinitionMatch = data.match(/var smiles=(\[{.*}]);/);
        if (smileDefinitionMatch === null) {
            if (typeof(onLoad) === "function") {
                onLoad(undefined);
            }
            return;
        }
        if (typeof(onLoad) === "function") {
            onLoad(JSON.parse(smileDefinitionMatch[1]));
        }
    }.bind(this)).fail( function () {
        if (this._isStopped) {
            return;
        }
        if (typeof(onLoad) === "function") {
            onLoad(undefined);
        }
    }.bind(this));
};

sc2tv.prototype._startChat = function () {
    this._chatTimerId = setInterval(this._readChat.bind(this), this._CHAT_RELOAD_INTERVAL);
    this._readChat();
};

sc2tv.prototype._stopChat = function () {
    this._isStopped = true;
    clearInterval(this._chatTimerId);
    clearTimeout(this._channelTimerId);
    clearTimeout(this._smileDefinitionUrlTimerId);
};

sc2tv.prototype._readChat = function () {
    $.ajaxSetup({
        ifModified: true,
        cache: true
    });
    $.getJSON(this._CHAT_URL + 'memfs/channel-' + this._channelId + '.json', function(jsonData) {
        if (this._isStopped) {
            return;
        }
        if (jsonData === undefined) {
            return;
        }
        var jsonMessages = jsonData.messages;
        for (var i = jsonMessages.length - 1; i >=0; --i) {
            var chatMessage = new Message();
            chatMessage.message = this._htmlify(jsonMessages[i].message);
            chatMessage.nickname = jsonMessages[i].name;
            chatMessage.id = jsonMessages[i].id;
            chatMessage.time = new Date(jsonMessages[i].date);
            chatMessage.isPersonal = jsonMessages[i].message.toLowerCase().indexOf("[b]" + this.channel.toLowerCase() + "[/b]") === 0;
            if (typeof(this.onMessage) === "function") {
                this.onMessage(this, chatMessage);
            }
        }
    }.bind(this));
};

sc2tv.prototype._URLPatternStr = '((?:(?:ht|f)tps?)(?:://))' + '(((?:(?:[a-z\u0430-\u0451\\d](?:[a-z\u0430-\u0451\\d-]*[a-z\u0430-\u0451\\d])*)\\.)+(?:[a-z]{2,}|\u0440\u0444)' + '|(?:(?:\\d{1,3}\\.){3}\\d{1,3}))' + '(:\\d+)?' + '(/[-a-z\u0430-\u0451\\d%_~\\+\\(\\):]*(?:[\\.,][-a-z\u0430-\u0451\\d%_~\\+\\(\\):]+)*)*' + '(\\?(?:&amp;|&quot;|&#039|[&"\'.:;a-z\u0430-\u0451\\d%_~\\+=-])*)?' + '(#(?:&amp;|&quot;|&#039|[\*!\(\)\/&"\'.:;a-z\u0430-\u0451\\d%_~\\+=-])*)?)';
sc2tv.prototype._bbCodeURLPattern = new RegExp('\\[url\\]' + sc2tv.prototype._URLPatternStr + '\\[\/url\\]()', 'gi');
sc2tv.prototype._bbCodeURLWithTextPattern = new RegExp('\\[url=' + sc2tv.prototype._URLPatternStr + '\\]([\u0020-\u007E\u0400-\u045F\u0490\u0491\u0207\u0239\u2012\u2013\u2014]+?)\\[\/url\\]', 'gi');
sc2tv.prototype._URLPattern = new RegExp(this._URLPatternStr, 'gi');
sc2tv.prototype._bbCodeBoldPattern = new RegExp('\\[b\\]([\\s\\S]+?)\\[/b\\]', 'gi');

sc2tv.prototype._bbCodeToHtml = function (str) {
    str = str.replace(this._bbCodeURLWithTextPattern, this._bbCodeURLToHtml);
    str = str.replace(this._bbCodeURLPattern, this._bbCodeURLToHtml);
//    str = str.replace(this._URLPattern, this._bbCodeURLToHtml);
    str = str.replace(this._bbCodeBoldPattern, '<strong>$1</strong>');
    return str;
}

sc2tv.prototype._bbCodeURLToHtml = function (str, proto, url, host, port, path, query, fragment, text) {
    url = url.replace(/:s:/gi, ':%73:');
    if (!text) {
        text = url;
    }
    if (text.length <= 60) {
        return '<a rel="nofollow" href="' + proto + url + '" title="' + proto + url + '" target="_blank">' + text + '</a>';
    } else {
        length = text.length;
        return '<a rel="nofollow" href="' + proto + url + '" target="_blank" title="' + proto + url + '">' + text.substring(0, 30) + '...' + text.substring(length - 20) + '</a>';
    }
}

sc2tv.prototype._CHAT_IMG_PATH = 'http://chat.sc2tv.ru/img/';
sc2tv.prototype._smileDefinition = null;
sc2tv.prototype._smileHtmlReplacement = null;

sc2tv.prototype._buildSmilesReplacement = function(sc2tvSmiles) {
    for (i = 0; i < sc2tvSmiles.length; i++) {
        this._smileHtmlReplacement[i] = '<img src="' + this._CHAT_IMG_PATH + sc2tvSmiles[i].img + '" width="' + sc2tvSmiles[i].width + '" height="' + sc2tvSmiles[i].height + '" class="sc2tv-smile"/>';
    }
};

sc2tv.prototype._htmlify = function (message) {
    message = this._bbCodeToHtml(message);
    message = message.replace(/:s(:[-a-z0-9]{2,}:)/gi, function(match, code) {
        var indexOfSmileWithThatCode = -1;
        for (var i = 0; i < this._smileDefinition.length; i++) {
            if (this._smileDefinition[i].code == code) {
                indexOfSmileWithThatCode = i;
                break;
            }
        }
        var replace = '';
        if (indexOfSmileWithThatCode != -1) {
            replace = this._smileHtmlReplacement[indexOfSmileWithThatCode];
        } else {
            replace = match;
        }
        return replace;
    }.bind(this));
    return message;
};
