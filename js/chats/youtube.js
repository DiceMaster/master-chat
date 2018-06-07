var youtube = function(channel, username, password) {
    this.channel = channel;
    this._username = username;
    this._password = password;
    this._request = require("request");

    this._startChat();
};

youtube.prototype.onMessage = null;
youtube.prototype.onStatusChange = null;
youtube.prototype.onUsersCountChange = null;

youtube.prototype.name = "youtube";
youtube.prototype.displayName = "YouTube.com";
youtube.prototype.channel = null;

youtube.prototype.chatLogoClass = "chat_youtube_logo";

youtube.prototype.stopChat = function () {
    this._stopChat();
};

youtube.prototype.postMessage = function(message, to) {

};

youtube.prototype._CHAT_URL = "https://www.youtube.com/live_comments?action_get_comments=1&video_id={0}&lt={1}&format=json&comment_version=1";
youtube.prototype._CHANNEL_RETRY_INTERVAL = 10000;
youtube.prototype._CHAT_RELOAD_INTERVAL = 5000;

youtube.prototype._isStopped = false;
youtube.prototype._lastTime = 0;
youtube.prototype._username = null;
youtube.prototype._password = null;

youtube.prototype._fireErrorMessage = function (messageText) {
    var errorMessage = new Message();
    errorMessage.message = messageText;
    errorMessage.isError = true;
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, errorMessage);
    }
};

youtube.prototype._stopChat = function () {
    this._isStopped = true;
    clearInterval(this._chatTimerId);
};

youtube.prototype._startChat = function () {
    this._chatTimerId = setInterval(this._readChat.bind(this), this._CHAT_RELOAD_INTERVAL);
    this._readChat();
};

youtube.prototype._readChat = function () {
    this._request(this._CHAT_URL.replace("{0}", this.channel).replace("{1}", this._lastTime.toString()), function (error, response, body) {
        if (this._isStopped) {
            return;
        }
        if (error || response.statusCode !== 200) {
            return;
        }
        var parser=new DOMParser();
        var xmlDoc = parser.parseFromString(body,"text/xml");
        var content = xmlDoc.getElementsByTagName("html_content")[0];
        var jsonString = content.textContent;
        var contentObject = JSON.parse(jsonString);
        this._lastTime = contentObject.latest_time;
        for (var iComment = contentObject.comments.length - 1; iComment >= 0; --iComment) {
            var comment = contentObject.comments[iComment];
            this._processComment(comment);
        }
    }.bind(this));
};

youtube.prototype._processComment = function(comment) {
    var chatMessage = new Message();
    chatMessage.id = comment.comment_id;
    chatMessage.message = comment.comment;
    chatMessage.nickname = comment.author_name;
    chatMessage.time = new Date(comment.time_created * 1000);
    chatMessage.isPersonal = (comment.comment.indexOf(this._username + ",") === 0) ||
                             (comment.comment.indexOf("+" + this._username + " ") === 0);
    if (typeof(this.onMessage) === "function") {
        this.onMessage(this, chatMessage);
    }
};
