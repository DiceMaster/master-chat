var ChatWindowViewController = function(view, chatSource, configSource) {
    this._view = view;
    this._configSource = configSource;
    this._theme = this._loadTheme(this._configSource.getTheme());
    this._applyThemeStyle(this._theme);

    this._chatSource = chatSource;
    this._chatSource.addMessageListener(this._onmessage.bind(this));

    this._registerHotkeys();
};

ChatWindowViewController.prototype._chatSource = null;
ChatWindowViewController.prototype._view = null;
ChatWindowViewController.prototype._configSource = null;
ChatWindowViewController.prototype._theme = null;
ChatWindowViewController.prototype._styleElement = null;
ChatWindowViewController.prototype._autoScrollThreshold  = 50;

ChatWindowViewController.prototype._loadTheme = function (name) {
    return new Theme(name);
};

ChatWindowViewController.prototype._registerHotkeys = function() {
    var gui = require('nw.gui');

    var option = {
        key : "Ctrl+Shift+Up",
        active : function() {
            console.log("Global desktop keyboard shortcut: " + this.key + " active.");
        },
        failed : function(msg) {
            // :(, fail to register the |key| or couldn't parse the |key|.
            console.log(msg);
        }
    };

    var shortcut = new gui.Shortcut(option);
    gui.App.registerGlobalHotKey(shortcut);
};

ChatWindowViewController.prototype._applyThemeStyle = function (theme) {
    var style = theme.getStyle();
    if (!style) {
        return;
    }
    if (this._styleElement === null) {
        this._styleElement = document.createElement("style");
        this._styleElement.setAttribute("type", "text/css");
        document.getElementsByTagName('head')[0].appendChild(this._styleElement);
    }
    this._styleElement.innerHTML = style;
};

ChatWindowViewController.prototype._onmessage = function(message) {
    var isScrollAtBottom = this._view.scrollTop() + this._view.innerHeight() >= this._view.prop("scrollHeight") - this._autoScrollThreshold;

    var messageHtml = this._theme.getMessageHtml(message);
    this._view.append($(messageHtml));

    if (isScrollAtBottom) {
        this._view.scrollTop(this._view.prop("scrollHeight"));
    }
};
