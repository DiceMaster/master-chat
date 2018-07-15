import {Theme} from '/js/theme.js';


export class ChatWindowViewController {
    constructor (view, chatSource, configSource) {
        this._view = view;
        this._configSource = configSource;
        this._styleElement = null;
        this._theme = this._loadTheme(this._configSource.getTheme());
        this._applyThemeStyle(this._theme);

        this._chatSource = chatSource;
        this._chatSource.addMessageListener(this._onmessage.bind(this));

        this._parser = new DOMParser();

        this._autoScrollThreshold  = 50;

        this._registerHotkeys();
    }

    _loadTheme (name) {
        return new Theme(name);
    }
    
    _registerHotkeys () {
        let option = {
            key : "Ctrl+Shift+Up",
            active : function() {
                console.log("Global desktop keyboard shortcut: " + this.key + " active.");
            },
            failed : function(msg) {
                // :(, fail to register the |key| or couldn't parse the |key|.
                console.log(msg);
            }
        };
    
        let shortcut = new nw.Shortcut(option);
        nw.App.registerGlobalHotKey(shortcut);
    }
    
    _applyThemeStyle (theme) {
        let style = theme.getStyle();
        if (!style) {
            return;
        }
        if (!this._styleElement) {
            this._styleElement = document.createElement("style");
            this._styleElement.setAttribute("type", "text/css");
            document.getElementsByTagName('head')[0].appendChild(this._styleElement);
        }
        this._styleElement.innerHTML = style;
    }
    
    _onmessage (message) {
        let isScrollAtBottom = this._view.scrollTop + this._view.clientHeight >= this._view.scrollHeight - this._autoScrollThreshold;
    
        let messageHtml = this._theme.getMessageHtml(message).trim();
        let nodes = this._parser.parseFromString(messageHtml, 'text/html').body.childNodes;

        for (let node of nodes) {
            this._view.appendChild(node);
        }
    
        if (isScrollAtBottom) {
            this._view.scrollTop = this._view.scrollHeight;
        }
    }
}
