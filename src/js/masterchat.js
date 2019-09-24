import {AppLifeCycleService} from '/src/js/services/appLifeCycleService.js';
import {ConfigService} from '/src/js/services/configService.js';
import {RankController} from '/src/js/rankController.js';
import {ChannelService} from '/src/js/services/channelService.js';
import {MessageService} from '/src/js/services/messageService.js';
import {ChannelStatusService} from '/src/js/services/channelStatusService.js';
import {MessageListViewController} from '/src/js/controllers/messageListViewController.js';
import {ChannelStatusViewController} from '/src/js/controllers/channelStatusViewController.js';
import {CommandController} from '/src/js/commandController.js';
import {RankedQueueService} from '/src/js/services/rankedQueueService.js';
import {GiveawayService} from '/src/js/services/giveawayService.js';
import {RankedQueueViewController} from '/src/js/controllers/rankQueueViewController.js';
import {GiveawayViewController} from '/src/js/controllers/giveawayViewController.js';

function initWindow() {
    let win = nw.Window.get();
    win.on('new-win-policy', function(frame, url, policy){
        policy.ignore();
        nw.Shell.openExternal( url );
    });
    win.setAlwaysOnTop(true);
}

function initContextMenu(rankedQueueService, giveawayService) {
    document.body.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        const menu = new nw.Menu();

        const queueItem = new nw.MenuItem({ label: 'Очередь' });
        queueItem.click = function() {
            new RankedQueueViewController(rankedQueueService);
        };
        menu.append(queueItem);

        const giveawayItem = new nw.MenuItem({ label: 'Розыгрыш' });
        giveawayItem.click = function() {
            new GiveawayViewController(giveawayService);
        };
        menu.append(giveawayItem);

        menu.popup(ev.x, ev.y);
        return false;
    });
}

function init() {
    const appLifeCycleService = new AppLifeCycleService();
    const configService = new ConfigService("config.json", appLifeCycleService);
    const channelService = new ChannelService(configService);
    const rankController = new RankController(configService);
    const messageService = new MessageService(channelService, rankController, configService);
    const channelStatusService = new ChannelStatusService(channelService);
    const rankedQueueService = new RankedQueueService("rankedQueue.json", appLifeCycleService, rankController);
    const giveawayService = new GiveawayService(messageService);
    new CommandController(messageService, rankController, rankedQueueService);
    const messageListView = document.getElementById('message_list');
    const messageTemplate = document.getElementById('message-template').innerHTML;
    new MessageListViewController(messageListView, messageService, messageTemplate, configService);
    const channelStatusListView = document.getElementById('channel_status_list');
    new ChannelStatusViewController(channelStatusListView, channelStatusService);

    initWindow();
    initContextMenu(rankedQueueService, giveawayService);    
}

init();