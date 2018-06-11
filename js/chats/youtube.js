class youtube {
    constructor (channel, username, password) {
        this.channel = channel;
        this._username = username;
        this._password = password;
        this._request = require("request");

        this.name = "youtube";
        this.displayName = "YouTube.com";
        this.chatLogoClass = "chat_youtube_logo";

        this._CHAT_URL = "https://www.youtube.com/live_comments?action_get_comments=1&video_id={0}&lt={1}&format=json&comment_version=1";
        this._CHANNEL_RETRY_INTERVAL = 10000;
        this._CHAT_RELOAD_INTERVAL = 5000;

        this._isStopped = false;
        this._lastTime = 0;

        this.onMessage = null;
        this.onStatusChange = null;
        this.onUsersCountChange = null;

        this._startChat();
    }

    stopChat () {
        this._stopChat();
    }
    
    postMessage (message, to) {
    
    }
    
    _fireErrorMessage (messageText) {
        var errorMessage = new Message();
        errorMessage.message = messageText;
        errorMessage.isError = true;
        if (typeof(this.onMessage) === "function") {
            this.onMessage(this, errorMessage);
        }
    }
    
    _stopChat () {
        this._isStopped = true;
        clearInterval(this._chatTimerId);
    }
    
    _startChat () {
        this._chatTimerId = setInterval(this._readChat.bind(this), this._CHAT_RELOAD_INTERVAL);
        this._readChat();
    }
    
    _readChat () {
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
    }
    
    _processComment (comment) {
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
    }
}
