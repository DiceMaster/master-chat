var AppLifeCycleService = function() {
    this._onCloseListeners = [];
    this._win = nw.Window.get();
    this._win.on('close', this._onClose.bind(this));
};

AppLifeCycleService.prototype.onClose = function(listener) {
    if (typeof(listener) !== "function") {
        return;
    }
    this._onCloseListeners.push(listener);
};

AppLifeCycleService.prototype._win = null;
AppLifeCycleService.prototype._onCloseListeners = null;

AppLifeCycleService.prototype._onClose = function () {
    for (var iListener = 0; iListener < this._onCloseListeners.length; ++iListener) {
        this._onCloseListeners[iListener]();
    }
    this._win.close(true);
};
