export class AppLifeCycleService {
    constructor () {
        this._onCloseListeners = [];
        this._win = nw.Window.get();
        this._win.on('close', this._onWinClose.bind(this));
    }

    onClose (listener) {
        if (typeof(listener) !== "function") {
            return;
        }
        this._onCloseListeners.push(listener);
    }
    
    _onWinClose () {
        for (var iListener = 0; iListener < this._onCloseListeners.length; ++iListener) {
            this._onCloseListeners[iListener]();
        }
        this._win.close(true);
    }
}
