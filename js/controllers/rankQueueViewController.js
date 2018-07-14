class RankedQueueViewController {
    constructor (rankerQueueService) {
        this._rankerQueueService = rankerQueueService;
        this._rankerQueueService.onupdate = this._onRankedQueueServiceUpdate.bind(this);
        this._window = nw.Window.open('rankedQueue.html', {
            position: 'center',
            width: 400,
            height: 400
        });
    }

    show () {
        this._window.show();
    }
    
    hide () {
        this._window.hide();
    }
    
    _onRankedQueueServiceUpdate () {
    
    }
}
