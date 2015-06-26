var ChatWindowViewController = function(view, chatSource) {
    this._view = view;
    this._chatSource = chatSource;
    this._chatSource.onmessage = this._onmessage.bind(this);
};

ChatWindowViewController.prototype._chatSource = null;
ChatWindowViewController.prototype._view = null;

ChatWindowViewController.prototype._onmessage = function(message) {
    var isScrollAtBottom = this._view.scrollTop() + this._view.innerHeight() >= this._view.prop("scrollHeight");

    if (message.isSystem) {
        this._view.append($("<div class='system_message'>" + message.message + "</div>"));
    } else {
        var messageClass = "";
        if (message.isPersonal) {
            messageClass += "message-to-user";
        }
        if (messageClass.length > 0) {
            this._view.append($("<div><img class='chat_logo' src='img/" + message.chatLogo + "'><img width=16 height=16 class='chat_logo' src='" + message.rankIcon + "'><span class='nick role-user'>" + message.nickname + ":</span> <span class='" + messageClass + "'>" + message.message + "</span></div>"));
        } else {
            this._view.append($("<div><img class='chat_logo' src='img/" + message.chatLogo + "'><img width=16 height=16 class='chat_logo' src='" + message.rankIcon + "'><span class='nick role-user'>" + message.nickname + ":</span> " + message.message + "</div>"));
        }
    }

    if (isScrollAtBottom) {
        this._view.scrollTop(this._view.prop("scrollHeight"));
    }
};