import {ChannelStatus} from '/src/js/model/channelStatus.js';

export class ChannelStatusService {
    constructor (channelService) {
        this._channelService = channelService;

        this.onStatusChanged = null;

        this._initializeStatuses();
    }

    getStatuses () {
        return Object.values(this._statuses);
    }

    _initializeStatuses () {
        const suppotedChats = this._channelService.getChannels().filter(
            chat => typeof chat.onStatusChanged !== "undefined"
        );

        this._statuses = {};
        for (const chat of suppotedChats) {
            chat.onStatusChanged = this._onStatusChanged.bind(this, chat);

            const status = new ChannelStatus();
            status.channelType = chat.name;
            status.channelName = chat.channel;
            status.channelLogo = chat.chatLogoClass;

            const chatId = this._fullChatId(chat);
            this._statuses[chatId] = status;
        }
    }

    _onStatusChanged (chat, status, viewers) {
        const channelStatus = new ChannelStatus();
        channelStatus.channelType = chat.name;
        channelStatus.channelName = chat.channel;
        channelStatus.channelLogo = chat.chatLogoClass;
        channelStatus.status = status;
        channelStatus.viewers = viewers;

        const chatId = this._fullChatId(chat);
        this._statuses[chatId] = channelStatus;

        if (typeof this.onStatusChanged === "function") {
            this.onStatusChanged(channelStatus);
        }
    }

    _fullChatId (channel) {
        return channel.name + "_" + channel.channel;
    }
}
