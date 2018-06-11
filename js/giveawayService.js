class GiveawayService {
    constructor (rankController, chatSource) {
        this._rankController = rankController;
        this._chatSource = chatSource;
        this._chatSource.addMessageListener(this._onMessage.bind(this));

        this.onstatechange = null;
        this.oncountdown = null;
        this.onnewparticipant = null;

        this._state = GiveawayService.State.None;
        this._keyword = null;
        this._duration = 0;
        this._remains = 0;
        this._winnersCount = 0;
        this._winners = null;
        this._participants = null;
        this._participantsCount = 0;
        this._countdownTimer = null;
        this._random = null;
    }

    getState () {
        return this._state;
    }
    
    getWinners () {
        return this._winners;
    }
    
    getParticipantsCount () {
        return this._participantsCount;
    }
    
    startPoll (keyword, duration, winners) {
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
    }
    
    finishPoll () {
        if (this._state !== GiveawayService.State.Winners) {
            return;
        }
        this._setState(GiveawayService.State.None);
    }
    
    _rankIdToAdvantage(rankId) {
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
    }
    
    _setState (newState) {
        this._state = newState;
        if (typeof this.onstatechange !== "function") {
            return;
        }
        this.onstatechange(this, newState);
    }
    
    _selectWinner () {
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
    }
    
    _onMessage (message) {
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
    }
    
    _onCountdownTimer (message) {
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
    }
}

GiveawayService.State = {
    None:   1,
    Gather: 2,
    Winners: 3
};
