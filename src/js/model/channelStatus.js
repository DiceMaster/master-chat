export class ChannelStatus {
    constructor () {
        this.channelType = null;
        this.channelName = null;
        this.channelLogo = null;

        this.status = ChannelStatus.Status.Unknown;
        this.viewers = 0;
    }
}

ChannelStatus.Status = {
    Unknown: 1,
    Updating: 2,
    Offline: 3,
    Live: 4
};
