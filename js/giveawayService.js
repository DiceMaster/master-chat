var GiveawayService = function(rankController, chatSource) {
    this._rankController = rankController;
    this._chatSource = chatSource;
    this._chatSource.addMessageListener(this._onMessage.bind(this));
};

GiveawayService.State = {
    None:   1,
    Gather: 2,
    Winners: 3
};

GiveawayService.prototype.onstatechange = null;
GiveawayService.prototype.oncountdown = null;
GiveawayService.prototype.onnewparticipant = null;

GiveawayService.prototype.getState = function () {
    return this._state;
};

GiveawayService.prototype.getWinners = function () {
    return this._winners;
};

GiveawayService.prototype.getParticipantsCount = function () {
    return this._participantsCount;
};

GiveawayService.prototype.startPoll = function (keyword, duration, winners) {
    if (this._state !== GiveawayService.State.None) {
        return;
    }

    this._keyword = keyword.toLowerCase();
    this._duration = duration;
    this._remains = duration;
    this._winnersCount = winners;
    this._participantsCount = 0;
    this._winners = [];
    this._participants = [];
    this._countdownTimer = setInterval(this._onCountdownTimer.bind(this), 1000);
    if (typeof this.oncountdown !== "function") {
        return;
    }
    this.oncountdown(this, this._remains);
    this._setState(GiveawayService.State.Gather);
};

GiveawayService.prototype.finishPoll = function () {
    if (this._state !== GiveawayService.State.Winners) {
        return;
    }
    this._setState(GiveawayService.State.None);
};

GiveawayService.prototype._rankController = null;
GiveawayService.prototype._chatSource = null;
GiveawayService.prototype._state = GiveawayService.State.None;
GiveawayService.prototype._keyword = null;
GiveawayService.prototype._duration = 0;
GiveawayService.prototype._remains = 0;
GiveawayService.prototype._winnersCount = 0;
GiveawayService.prototype._winners = null;
GiveawayService.prototype._participants = null;
GiveawayService.prototype._participantsCount = 0;
GiveawayService.prototype._countdownTimer = null;
GiveawayService.prototype._random = null;


GiveawayService.prototype._rankIdToAdvantage = function(rankId) {
    var advantage = {
        "rookie": 1,
        "squaddie": 2,
        "corporal": 4,
        "sergeant": 6,
        "lieutenant": 8,
        "captain": 10,
        "major": 12,
        "colonel": 15
    }[rankId];
    if (advantage === undefined) {
        advantage = 1;
    }
    return advantage;
};

GiveawayService.prototype._setState = function (newState) {
    this._state = newState;
    if (typeof this.onstatechange !== "function") {
        return;
    }
    this.onstatechange(this, newState);
};

GiveawayService.prototype._selectWinner = function () {
    if (this._state !== GiveawayService.State.Gather) {
        return;
    }

    var iWinner = 0;
    while (this._participants.length > 0 && iWinner < this._winnersCount) {
        var winnerIndex = Math.floor(Math.random() * this._participants.length);
        var winner = this._participants[winnerIndex];
        this._winners.push(winner);
        this._participants = this._participants.filter(function(value) {
            return value !== winner;
        });
        iWinner++;
    }

    this._setState(GiveawayService.State.Winners);
};

GiveawayService.prototype._onMessage = function (message) {
    if (this._state !== GiveawayService.State.Gather) {
        return;
    }
    if (message.message.toLowerCase().indexOf(this._keyword, 0) !== 0) {
        return;
    }
    var iParticipant = 0;
    for (; iParticipant < this._participants.length; iParticipant++) {
        if (this._participants[iParticipant].name === message.nickname &&
            this._participants[iParticipant].chat === message.chat &&
            this._participants[iParticipant].channel === message.channel) {

            break;
        }
    }
    if (iParticipant < this._participants.length) {
        return;
    }

    var participant = new GiveawayUser();
    participant.name = message.nickname;
    participant.chat = message.chat;
    participant.channel = message.channel;
    participant.chatLogo = message.chatLogo;
    participant.rankId = message.rankId;
    participant.advantage = this._rankIdToAdvantage(participant.rankId);
    participant.rankIcon = message.rankIcon;
    for (var i = 0; i < participant.advantage; i++) {
        this._participants.push(participant);
    }
    this._participantsCount++;
    if (typeof this.onnewparticipant !== "function") {
        return;
    }
    this.onnewparticipant(this, participant);
};

GiveawayService.prototype._onCountdownTimer = function (message) {
    this._remains--;
    if (this._remains <= 0) {
        clearInterval(this._countdownTimer);
        this._selectWinner();
        return;
    }

    if (typeof this.oncountdown !== "function") {
        return;
    }
    this.oncountdown(this, this._remains);
};