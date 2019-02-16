export class Theme {
    constructor (name) {
        this.name = name;
        this._templateDir = "templates/" + this.name + "/";
        this._cssPath = "/" + this._templateDir + "style.css";
        this._loadTheme();
    }

    getCssPath () {
        return this._cssPath;
    }
    
    getMessageHtml (message) {
        const messageCopy = Object.assign({}, message);
        messageCopy.rankIcon = "/" + this._templateDir + message.rankIcon;

        return this._messageTemplate(messageCopy);
    }
    
    _loadTheme () {
        const fs = require('fs');
        const messageTemplate = fs.readFileSync(this._templateDir + "message.hbs", "UTF-8");

        const handlebars = require('handlebars');
        this._messageTemplate = handlebars.compile(messageTemplate);
    }
}
