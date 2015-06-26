var ConfigSource = function(filename) {
    this._configPath = filename;
    this._fs = require("fs");

    this._loadConfig(filename);
};

ConfigSource.prototype.config = null;

ConfigSource.prototype._configPath = null;
ConfigSource.prototype._fs = null;

ConfigSource.prototype.saveConfig = function () {
    if (!this.isLoaded) {
        return;
    }
    this._fs.writeFile(this._configPath, JSON.stringify(this.config), function (err) {
        if (err) {
            throw err;
        }
    });
};

ConfigSource.prototype._loadConfig = function (filename) {
    var data = this._fs.readFileSync(filename);
    this.config = JSON.parse(data);
};