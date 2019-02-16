import {ChannelStatus} from '/src/js/model/channelStatus.js';
import {ChannelStatusView} from '/src/js/model/channelStatusView.js';

export class ChannelStatusViewController {
    constructor (view, channelStatusService) {
        this._view = view;
        this._channelStatusService = channelStatusService;
        this._channelStatusService.onStatusChanged = this._onStatusChanged.bind(this);

        this._channelViews = {};

        this._init();
    }
    
    _init () {
        const statuses = this._channelStatusService.getStatuses();
        for (const status of statuses) {
            const statusView = this._createStatusView();
            statusView.logoView.classList.add(status.channelLogo);

            this._view.appendChild(statusView.containerVeiw);

            this._updateStatusView(statusView, status);

            const channelId = this._fullChatId(status.channelType, status.channelName);
            this._channelViews[channelId] = statusView;
        }
    }

    _createStatusView () {
        const containerVeiw = this._view.ownerDocument.createElement("div");
        containerVeiw.classList.add("channel_status");

        const logoView = this._view.ownerDocument.createElement("div");
        logoView.classList.add("chat_logo");

        const statusIndicatorView = this._view.ownerDocument.createElement("div");
        statusIndicatorView.classList.add("channel_status_indicator");

        const viewersCountView = this._view.ownerDocument.createElement("span");
        viewersCountView.classList.add("channel_status_viewers_count");

        containerVeiw.appendChild(logoView);
        containerVeiw.appendChild(statusIndicatorView);
        containerVeiw.appendChild(viewersCountView);

        const result = new ChannelStatusView();
        result.containerVeiw = containerVeiw;
        result.logoView = logoView;
        result.statusIndicatorView = statusIndicatorView;
        result.viewersCountView = viewersCountView;

        return result;
    }

    _updateStatusView(statusView, status) {
        statusView.viewersCountView.textContent = this._messageForStatus(status);

        statusView.containerVeiw.className = "";
        statusView.containerVeiw.classList.add("channel_status");
        
        let statusName;
        switch (status.status) {
            case ChannelStatus.Status.Live:
                statusName = "on";
                break;
            case ChannelStatus.Status.Offline:
                statusName = "off";
                break;
            default:
                statusName = "none";
        }

        statusView.containerVeiw.classList.add("channel_status_" + statusName);
    }

    _onStatusChanged (status) {
        const channelId = this._fullChatId(status.channelType, status.channelName);
        const statusView = this._channelViews[channelId];
        if (!statusView) {
            return;
        }

        this._updateStatusView(statusView, status);
    }

    _fullChatId (channelType, channelName) {
        return channelType + "_" + channelName;
    }

    _messageForStatus (status) {
        return status.viewers;
    }
}
