import {Theme} from '/src/js/theme.js';

export class MessageListViewController {
    constructor (view, messageService, messageTemplate, configService) {
        this._view = view;
        this._document = view.ownerDocument;
        this._configService = configService;
        this._cssLinkElement = null;
        this._theme = this._loadTheme(this._configService.getThemeName());
        this._applyThemeStyle(this._theme);

        this._messageService = messageService;
        this._messageService.addMessageListener(this._onmessage.bind(this));

        const handlebars = require('handlebars');
        this._messageTemplate = handlebars.compile(messageTemplate);

        this._parser = new DOMParser();

        this._autoScrollThreshold  = 1;
        this._autoScroll = true;

        this._view.onscroll = (e => {
            this._autoScroll = this._scrollPositionIsAtBottom();
        }).bind(this);

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
            this._cssLinkElement = this._document.createElement("link");
            this._cssLinkElement.setAttribute("rel", "stylesheet");
            this._cssLinkElement.setAttribute("type", "text/css");
            this._cssLinkElement.setAttribute("href", cssPath);

            this._document.getElementsByTagName('head')[0].appendChild(this._cssLinkElement);
        }
    }
    
    _onmessage (message) {
        const messageCopy = Object.assign({}, message);
        messageCopy.rankIcon = this._theme.getRankIconPath(message.rankIcon);
    
        const messageHtml = this._messageTemplate(messageCopy).trim();
        const nodes = this._parser.parseFromString(messageHtml, 'text/html').body.childNodes;

        for (let node of nodes) {
            this._view.appendChild(node);

            this._forEachImage(node, img => {
                img.onload = (function () {
                    this._scrollIfNeeded();
                }).bind(this);
            });
        }

        this._scrollIfNeeded();
    }

    _scrollPositionIsAtBottom() {
        return this._view.scrollTop + this._view.clientHeight >= this._view.scrollHeight - this._autoScrollThreshold;
    }

    _scrollIfNeeded() {
        if (this._scrollPositionIsAtBottom()) {
            return;
        }

        if (this._autoScroll) {
            this._view.scrollTop = this._view.scrollHeight;
        }
    }

    _forEachImage(node, func) {
        if (node instanceof HTMLImageElement) {
            func(node);
        }
        node = node.firstChild;
        while (node) {
            this._forEachImage(node, func);
            node = node.nextSibling;
        }
    }
}
