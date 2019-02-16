export class Channel {
    constructor (type, channelId) {
        this.type = type;
        this.channelId = channelId;
        this.lastMessageTime = new Date(0);
    }
} 
