var RankedQueueViewController = function(rankerQueueService) {
    this._rankerQueueService = rankerQueueService;
    this._rankerQueueService.onupdate = this._onRankedQueueServiceUpdate.bind(this);
    this._window = nw.Window.open('rankedQueue.html', {
        position: 'center',
        toolbar: false,
        width: 400,
        height: 400
    });
};

RankedQueueViewController.show = function () {
    this._window.show();
};

RankedQueueViewController.hide = function () {
    this._window.hide();
};



RankedQueueViewController.prototype._rankerQueueService = null;
RankedQueueViewController.prototype._window = null;

RankedQueueViewController.prototype._onRankedQueueServiceUpdate = function() {

};
