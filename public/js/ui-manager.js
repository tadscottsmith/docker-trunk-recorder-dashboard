import { FilterManager } from './components/filter-manager.js';
import { TalkgroupCard } from './components/talkgroup-card.js';

export class UIManager {
    constructor(talkgroupManager) {
        this.talkgroupManager = talkgroupManager;
        this.filterManager = new FilterManager(talkgroupManager, () => this.updateUI());
        this.talkgroupCard = new TalkgroupCard(talkgroupManager);
    }

    async setupFilterControls() {
        await this.filterManager.setupFilterControls();
    }

    updateUI() {
        const container = document.getElementById('talkgroups');
        container.innerHTML = '';

        const { showActiveOnly, currentSort } = this.filterManager.getFilterState();
        const entries = this.talkgroupManager.getTalkgroupEntries(showActiveOnly, currentSort);

        for (const [talkgroup, radios] of entries) {
            container.appendChild(this.talkgroupCard.create(talkgroup, radios));
        }
    }
}
