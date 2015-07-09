var Theme = function (name) {
    this.name = name;
    this._loadTheme();
};

Theme.prototype.name = null;

Theme.prototype.getStyle = function (){
    return this._css;
};

Theme.prototype.getMessageHtml = function (message){
    return this._messageTemplate(message);
};

Theme.prototype._css = null;
Theme.prototype._messageTemplate = null;

Theme.prototype._loadTheme = function () {
    var fs = require("fs");
    this._css = fs.readFileSync("templates/" + this.name + "/style.css", "UTF-8");
    var messageTemplate = fs.readFileSync("templates/" + this.name + "/message.hbs", "UTF-8");
    this._messageTemplate = Handlebars.compile(messageTemplate);
};
