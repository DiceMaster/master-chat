import {Message} from '/src/js/model/message.js';
import {HtmlTools} from '/src/js/util/htmlTools.js';

export class peka2tv {
    constructor (channel, username, password) {
        this.channel = channel;
        this._username = username;
        this._password = password;

        this.name = "peka2tv";
        this.displayName = "peka2.tv";    
        this.chatLogoClass = "chat_peka2tv_logo";

        this._API_URL = "https://sc2tv.ru";
        this._CHANNEL_RETRY_INTERVAL = 10000;
        this._CHAT_RELOAD_INTERVAL = 5000;

        this._bbCodeBoldPattern = new RegExp('\\[b\\]([\\s\\S]+?)\\[/b\\]', 'gi');

        this._channelId = null;
        this._socket = null;
        this._token = null;
        this._userId = null;

        this.onMessage = null;
        this.onStatusChange = null;
        this.onUsersCountChange = null;
        
        this._isStopped = false;
        
        this._request = require("request");
        this._smiles = [];
        this._usersIdentifiers = {};
        this._receivedMessageIds = new Set();

        this._connectToChannel();
    }

    async _connectToChannel() {
        var actions = [this._findChannelId(), this._getSmiles()];
        if (this._username && this._password) {
            actions.push(this._login());
        }
        
        var results;
        try {
            results = await Promise.all(actions);
        } catch (err) {
            console.log(err);
            this._fireErrorMessage("Ошибка подключения к каналу " + channel + " на peka2.tv.");
            return;
        }
        
        this._channelId = results[0];
        this._smiles = results[1];
        if (this._username && this._password) {
            this._token = results[2].token;
            this._userId = results[2].userId;
        }
        this._connectToChat();
    }

    stopChat () {
        this._isStopped = true;
        clearInterval(this._chatTimerId);
        clearTimeout(this._channelTimerId);
        clearTimeout(this._smileDefinitionUrlTimerId);
    }
    
    postMessage (message, to) {
        if (!this._socket || !this._token) {
            return;
        }
        this._socket.emit('/chat/publish', {
                "channel": "stream/" + this._channelId,
                "from": {
                    "id": this._userId,
                    "name": this._username
                },
                "to": to ? {
                    "id": this._usersIdentifiers[to],
                    "name": to
                } : null,
                "text": message
        });
    }
    
    _fireErrorMessage (messageText) {
        var errorMessage = new Message();
        errorMessage.message = messageText;
        errorMessage.isError = true;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, errorMessage);
        }
    }
        
    async _login() {
        const url = this._API_URL + "/api/user/login";

        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify({'name': this._username,
                                  'password': this._password}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const json = await response.json();

        return { "token": json.token, "userId": json.current.id }
    }
    
    async _findChannelId () {
        const url = this._API_URL + "/api/user";

        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify({'name': this.channel}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const json = await response.json();

        return json.id;
    }
    
    async _getSmiles () {
        const url = this._API_URL + '/api/smile';

        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify({'channel': this.channel}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return await response.json();
    }
    
    _flattenSmiles (smiles) {
        var flattenedSmiles = [];
        for (var iTab = 0; iTab < smiles.length; ++iTab) {
            flattenedSmiles = flattenedSmiles.concat(smiles[iTab]);
        }
        return flattenedSmiles;
    }
    
    _connectToChat () {
        var io = require('socket.io-client');
        this._socket = io('wss://chat.peka2.tv', {
            transports: ['websocket'],
            'reconnect': true,
            'reconnectionDelay': 500,
            'reconnectionDelayMax': 2000,
            'reconnectionAttempts': Infinity
        });
    
        this._socket.on('connect', function () {
            if (this._token) {
                this._socket.emit('/chat/login', { token: this._token});
            }
            this._socket.emit('/chat/join', {channel: "stream/" + this._channelId}, function () {
                this._socket.emit('/chat/history',
                    {"channel":"stream/"+this._channelId, "amount":20,"query":{"conditions":[],"groups":[],"glue":"and"}},
                    function (data) {
                        for (var iMessage = data.result.length - 1; iMessage >= 0 ; --iMessage) {
                            this._processMessage(data.result[iMessage]);
                        }
                    }.bind(this)
                );
            }.bind(this));
        }.bind(this));
        this._socket.on('/chat/message', function(data) {
            this._processMessage(data);
        }.bind(this));
        this._socket.on('connect_error', function(error) {
            console.log('Funstream.tv connection error: ' + error);
        });
    
        this._socket.on('reconnect', function() {
            console.log('Funstream.tv reconnection');
        });
    }
    
    _processMessage (message) {
        if (this._receivedMessageIds.has(message.id)) {
            return;
        }
        this._receivedMessageIds.add(message.id);
    
        var chatMessage = new Message();
        chatMessage.id = message.id;
        var messageText = (message.to != null ? "[b]" + message.to.name + "[/b], " : "") + message.text;
        chatMessage.message = this._htmlify(messageText);
        chatMessage.nickname = message.from.name;
        this._usersIdentifiers[message.from.name] = message.from.id;
        chatMessage.time = new Date(message.time * 1000);
        var streamerName = this._streamerName || this.channel;
        var donate = message.type === "donate" || message.type === "fastdonate";
        if (donate) {
            chatMessage.rankId = "donation";
        }
        chatMessage.isPersonal = donate || (message.to !== null && message.to.name === streamerName);
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, chatMessage);
        }
    }
    
    _htmlify (message) {
        message = HtmlTools.anchorLinksEscapeHtml(message);
        message = message.replace(this._bbCodeBoldPattern, '<strong>$1</strong>');

        for (var iSmile = 0; iSmile < this._smiles.length; ++iSmile) {
            var smile = this._smiles[iSmile];
            message = message.replace(
                ":" + smile.code + ":",
                '<img class="chat-smile" src="' +smile.url + '" width="' + smile.width + '" height="' + smile.height + '" title="' + smile.code + '"/>');
        }
        return message;
    }
}
