export class GiveawayViewController {
    constructor (giveawayService) {
        this._giveawayService = giveawayService;
        this._giveawayService.onstatechange = this._onstatechange.bind(this);
        this._giveawayService.oncountdown = this._oncountdown.bind(this);
        this._giveawayService.onnewparticipant = this._onnewparticipant.bind(this);
        
        this._parser = new DOMParser();

        nw.Window.open('giveaway.html', {
            "position": 'center',
            "width": 400,
            "height": 700
        }, function (window) {
            this._window = window;

            this._window.on ('loaded', function(){
                this._onstatechange(this._giveawayService, this._giveawayService.getState());
                let doc = this._window.window.document;
                doc.querySelector('#giveaway-start').addEventListener('click', this._start.bind(this));
                doc.querySelector('#giveaway-restart').addEventListener('click', this._giveawayService.finishPoll.bind(this._giveawayService));
            }.bind(this));
        }.bind(this));
    }

    show () {
        this._window.show();
    }
    
    hide () {
        this._window.hide();
    }
    
    _onstatechange (giveawayService, newState) {
        let doc = this._window.window.document;
        
        let settingsNode = doc.querySelector('#giveaway-settings');
        settingsNode.style.display = newState === GiveawayService.State.None ? '' : 'none';
        
        if (newState === GiveawayService.State.Gather) {
            doc.querySelector('#giveaway-participants').innerHTML = '';
        }
        
        let listNode = doc.querySelector('#giveaway-list');
        listNode.style.display = newState === GiveawayService.State.Gather ? '' : 'none';

        if (newState === GiveawayService.State.Winners) {
            let container =  doc.querySelector('#giveaway-winners-list');
            container.innerHTML = '';
        
            let winners = this._giveawayService.getWinners();
        
            doc.querySelector('#giveaway-winners-title').textContent = winners.length === 1 ? "Победитель:" : "Победители:";
        
            for (var iWinner = 0; iWinner < winners.length; iWinner++) {
                this._addUser(winners[iWinner], container);
            }
        }
        
        let winnersNode = doc.querySelector('#giveaway-winners');
        winnersNode.style.display = newState === GiveawayService.State.Winners ? '' : 'none';
    }
    
    _oncountdown (giveawayService, remaining) {
        let doc = this._window.window.document;
        doc.querySelector('#giveaway-time-value').textContent = remaining.toString();
    }
    
    _onnewparticipant (giveawayService, participant) {
        let doc = this._window.window.document;

        let container = doc.querySelector('#giveaway-participants');
        this._addUser(participant, container);

        let participantsCountNode = doc.querySelector('#giveaway-participants-count-value');
        participantsCountNode.textContent = giveawayService.getParticipantsCount().toString();
    }
    
    _start () {
        let doc = this._window.window.document;

        let keyword = doc.querySelector('#giveaway-keyword').value;
        let duration = doc.querySelector('#giveaway-duration').value;
        let winners = doc.querySelector('#giveaway-winners-count').value;
        
        this._giveawayService.startPoll(keyword, duration, winners);
    }
    
    _addUser (user, container) {
        let userDivString = "<div class='giveaway-user'><div class='chat_logo " + user.chatLogo + "'></div>" +
            "<img width=20 height=20 class='chat_logo'src='" + user.rankIcon + "'>" +
            "<span class='nick username-normal'>" + user.name + "</span></div>";

        let node = this._parser.parseFromString(userDivString, 'text/html').body.firstChild;
        container.appendChild(node);
    }
}
