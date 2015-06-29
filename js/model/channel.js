var Channel = function (type, channelId) {
    this.type = type;
    this.channelId = channelId;
    this.lastMessageTime = new Date(0);
};

Channel.prototype.type = null;
Channel.prototype.channelId = null;
Channel.prototype.lastMessageTime = null;
