var gg = function(channel) {
    this.channel = channel;
    this._connect();
};

gg.prototype.onMessage = null;
gg.prototype.onStatusChange = null;
gg.prototype.onUsersCountChange = null;

gg.prototype.name = "gg";
gg.prototype.displayName = "GoodGame.ru";
gg.prototype.channel = null;

gg.prototype.chatImage = "gg.png";

gg.prototype.getStatusImage = function (status) {

};

gg.prototype.getSmileImage = function (status) {

};

gg.prototype.stopChat = function () {

};

gg.prototype._CHAT_URL = "http://chat.goodgame.ru:8081/chat";

gg.prototype._socket = null;

gg.prototype._connect = function () {
    this._socket = new SockJS(this._CHAT_URL);
    this._socket.onopen = function() {
        console.log('open');
    };
    this._socket.onclose = function() {
        console.log('close');
    };
    this._socket.onmessage = function(e) {
        console.log('message', e.data);
    };
};