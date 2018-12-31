import {Theme} from '/js/theme.js';

export class MessageListViewController {
    constructor (view, messageService, configService) {
        this._view = view;
        this._configService = configService;
        this._cssLinkElement = null;
        this._theme = this._loadTheme(this._configService.getThemeName());
        this._applyThemeStyle(this._theme);

        this._messageService = messageService;
        this._messageService.addMessageListener(this._onmessage.bind(this));

        this._parser = new DOMParser();

        this._autoScrollThreshold  = 50;

        this._registerHotkeys();
    }

    _loadTheme (name) {
        return new Theme(name);
    }
    
    _registerHotkeys () {
        const option = {
            key : "Ctrl+Shift+Up",
            active : function() {
                console.log("Global desktop keyboard shortcut: " + this.key + " active.");
            },
            failed : function(msg) {
                // :(, fail to register the |key| or couldn't parse the |key|.
                console.log(msg);
            }
        };
    
        const shortcut = new nw.Shortcut(option);
        nw.App.registerGlobalHotKey(shortcut);
    }
    
    _applyThemeStyle (theme) {
        const cssPath = theme.getCssPath();
        if (!cssPath) {
            return;
        }
        if (!this._cssLinkElement) {
            this._cssLinkElement = document.createElement("link");
            this._cssLinkElement.setAttribute("rel", "stylesheet");
            this._cssLinkElement.setAttribute("type", "text/css");
            this._cssLinkElement.setAttribute("href", cssPath);

            document.getElementsByTagName('head')[0].appendChild(this._cssLinkElement);
        }
    }
    
    _onmessage (message) {
        const isScrollAtBottom = this._view.scrollTop + this._view.clientHeight >= this._view.scrollHeight - this._autoScrollThreshold;
    
        const messageHtml = this._theme.getMessageHtml(message).trim();
        const nodes = this._parser.parseFromString(messageHtml, 'text/html').body.childNodes;

        for (let node of nodes) {
            this._view.appendChild(node);
        }
    
        if (isScrollAtBottom) {
            this._view.scrollTop = this._view.scrollHeight;
        }
    }
}
