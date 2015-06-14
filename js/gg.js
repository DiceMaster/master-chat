var gg = function(url) {
    this.url = url;
};

gg.prototype.onMessage = null;
gg.prototype.onStatusChange = null;
gg.prototype.onUsersCountChange = null;

gg.prototype.name = "gg";
gg.prototype.displayName = "GoodGame.ru";
gg.prototype.url = null;

gg.prototype.chatImage = "gg.png";

gg.prototype.getStatusImage = function (status) {

};

gg.prototype.getSmileImage = function (status) {

};
