class Theme {
    constructor (name) {
        this.name = name;
        this._loadTheme();
    }

    getStyle () {
        return this._css;
    }
    
    getMessageHtml (message) {
        return this._messageTemplate(message);
    }
    
    _loadTheme () {
        var fs = require("fs");
        this._css = fs.readFileSync("templates/" + this.name + "/style.css", "UTF-8");
        var messageTemplate = fs.readFileSync("templates/" + this.name + "/message.hbs", "UTF-8");
        this._messageTemplate = Handlebars.compile(messageTemplate);
    }
}
