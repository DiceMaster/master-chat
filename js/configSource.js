var ConfigSource = function(filename) {
    this._configPath = filename;
    this._fs = require("fs");

    var onload = null;

    Object.defineProperty(this, 'onload', {
        get: function() {
            return onload;
        }.bind(this),
        set: function(value) {
            onload = value;
            if (this.isLoaded && typeof(onload === "function")) {
                onload();
            }
        }.bind(this)
    });

    this._loadConfig(filename);
};

ConfigSource.prototype.config = null;
ConfigSource.prototype.isLoaded = false;

ConfigSource.prototype._configPath = null;
ConfigSource.prototype._fs = null;

ConfigSource.prototype.saveConfig = function () {
    if (!this.isLoaded) {
        return;
    }
    fs.writeFile(this._configPath, JSON.stringify(this.config), function (err) {
        if (err) {
            throw err;
        }
    });
};

ConfigSource.prototype._loadConfig = function (filename) {
    fs.readFile(filename, function read(err, data) {
        if (err) {
            throw err;
        }
        this.config = JSON.parse(data);
        this.isLoaded = true;
        if (typeof(this.onload) === "function") {
            this.onload();
        }
    }.bind(this));
};