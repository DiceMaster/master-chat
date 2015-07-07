var ChatWindowViewController = function(view, chatSource, configSource) {
    this._view = view;
    this._configSource = configSource;
    this._theme = this._loadTheme(this._configSource.getTheme());
    this._chatSource = chatSource;
    this._chatSource.onmessage = this._onmessage.bind(this);
};

ChatWindowViewController.prototype._chatSource = null;
ChatWindowViewController.prototype._view = null;
ChatWindowViewController.prototype._configSource = null;
ChatWindowViewController.prototype._theme = null;

ChatWindowViewController.prototype._loadTheme = function (name) {
    return new Theme(name);
};

ChatWindowViewController.prototype._onmessage = function(message) {
    var isScrollAtBottom = this._view.scrollTop() + this._view.innerHeight() >= this._view.prop("scrollHeight");

    if (message.isSystem) {
        this._view.append($("<div class='system_message'>" + message.message + "</div>"));
    } else {
        var messageHtml = this._theme.getMessageHtml(message);
        this._view.append($(messageHtml));
    }

    if (isScrollAtBottom) {
        this._view.scrollTop(this._view.prop("scrollHeight"));
    }
};