import {Message} from '/js/model/message.js';
import {peka2tv} from '/js/chats/peka2tv.js';
import {gg} from '/js/chats/gg.js';
import {twitch} from '/js/chats/twitch.js';
import {youtube} from '/js/chats/youtube.js';

export class ChannelService {
    constructor (configService) {
        this._configService = configService;

        this._chats = {};
        this._chatAliases = {
            "peka2tv": peka2tv,
            "gg": gg,
            "twitch": twitch,
            "youtube": youtube
        };

        this._messageListeners = [];

        this._initializeChats();
    }

    addMessageListener (listener) {
        this._messageListeners.push(listener);
    }
    
    removeMessageListener (listener) {
        let index = this._messageListeners.indexOf(listener);
        if (index < 0) {
            return;
        }
        this._messageListeners.splice(index, 1);
    }

    getChatLogoClass (chatType, channel) {
        let channelId = this._fullChannelId(chatType, channel);
        let chat = this._chats[channelId];
        if (!chat) {
            return undefined;
        }

        return chat.chatLogoClass;
    }
    
    postMessage (message, to, chatType, channel) {
        let chat = this._chats[this._fullChannelId(chatType, channel)];
        if (typeof chat.postMessage !== "function") {
            return false;
        }

        return chat.postMessage(message, to);
    }

    fetchChennelStats (chat, channel, callback) {
        let chat = this._chats[this._fullChannelId(chat, channel)];
        if (typeof chat.fetchStats === "function") {
            chat.fetchStats(callback);
        }
    }
    
    _initializeChats  () {
        let channels = this._configService.getChannels();
        for (let iChat = 0; iChat < channels.length; ++iChat) {
            let chatDesc = channels[iChat];

            var parameters = [chatDesc.channelId];

            if (typeof chatDesc.username === "string") {
                parameters.push(chatDesc.username);

                if (typeof chatDesc.password === "string") {
                    parameters.push(chatDesc.password);
                }
            }

            let ChatClass = this._chatAliases[chatDesc.type];
            if (!ChatClass) {
                var errorMessage = new Message();
                errorMessage.message = "Unexpected chat type '" + chatDesc.type + "'.";
                errorMessage.isError = true;
                this._notifyMessageListeners(errorMessage);
                continue;
            }
            
            let chat = new (Function.prototype.bind.apply(ChatClass, [null].concat(parameters)));
            chat.onMessage = this._onMessage.bind(this);
            this._chats[this._fullChannelId(chat.name, chatDesc.channelId)] = chat;
        }
    }
    
    _notifyMessageListeners  (message) {
        for (let listener of this._messageListeners) {
            listener(message);
        }
    }
    
    _fullChannelId  (chatName, channelName) {
        return chatName + "_" + channelName;
    }
    
    _onMessage (chat, message) {
        message.chat = chat.name;
        message.channel = chat.channel;
        this._notifyMessageListeners(message);
    }  
}
