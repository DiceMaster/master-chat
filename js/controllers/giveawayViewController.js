var GiveawayViewController = function(giveawayService) {
    this._giveawayService = giveawayService;
    this._giveawayService.onstatechange = this._onstatechange.bind(this);
    this._giveawayService.oncountdown = this._oncountdown.bind(this);
    this._giveawayService.onnewparticipant = this._onnewparticipant.bind(this);
    this._window = nw.Window.open('giveaway.html', {
        "position": 'center',
        "toolbar": false,
        "width": 400,
        "height": 700,
        "always-on-top": true,
        "focus": true
    });
    this._window.on ('loaded', function(){
        this._onstatechange(this._giveawayService, this._giveawayService.getState());
        this._window.window.$("#giveaway-start").on("click", this._start.bind(this));
        this._window.window.$("#giveaway-restart").on("click", this._giveawayService.finishPoll.bind(this._giveawayService));
    }.bind(this));

};

GiveawayViewController.show = function () {
    this._window.show();
};

GiveawayViewController.hide = function () {
    this._window.hide();
};

GiveawayViewController.prototype._giveawayService= null;
GiveawayViewController.prototype._window = null;

GiveawayViewController.prototype._onstatechange = function (giveawayService, newState) {
    this._window.window.$("#giveaway-settings").toggle(newState === GiveawayService.State.None);
    if (newState === GiveawayService.State.Gather) {
        this._window.window.$("#giveaway-participants").empty();
    }
    this._window.window.$("#giveaway-list").toggle(newState === GiveawayService.State.Gather);
    if (newState === GiveawayService.State.Winners) {
        var container = this._window.window.$("#giveaway-winners-list");
        container.empty();
        var winners = this._giveawayService.getWinners();
        this._window.window.$("#giveaway-winners-title").text(winners.length === 1 ? "Победитель:" : "Победители:");
        for (var iWinner = 0; iWinner < winners.length; iWinner++) {
            this._addUser(winners[iWinner], container);
        }
    }
    this._window.window.$("#giveaway-winners").toggle(newState === GiveawayService.State.Winners);
};

GiveawayViewController.prototype._oncountdown = function (giveawayService, remaining) {
    this._window.window.$("#giveaway-time-value").text(remaining.toString());
};

GiveawayViewController.prototype._onnewparticipant = function (giveawayService, participant) {
    this._addUser(participant, this._window.window.$("#giveaway-participants"));
    this._window.window.$("#giveaway-participants-count-value").text(giveawayService.getParticipantsCount().toString());
};

GiveawayViewController.prototype._start = function () {
    var keyword = this._window.window.$("#giveaway-keyword").val();
    var duration = this._window.window.$("#giveaway-duration").val();
    var winners = this._window.window.$("#giveaway-winners-count").val();
    this._giveawayService.startPoll(keyword, duration, winners);
};

GiveawayViewController.prototype._addUser = function (user, container) {
    var userDivString = "<div class='giveaway-user'><div class='chat_logo " + user.chatLogo + "'></div>" +
        "<img width=20 height=20 class='chat_logo'src='" + user.rankIcon + "'>" +
        "<span class='nick username-normal'>" + user.name + "</span></div>";
    container.append(this._window.window.$(userDivString));
};
