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

        const filterState = this.filterManager.getFilterState();
        const entries = this.talkgroupManager.getTalkgroupEntries(filterState);

        for (const [talkgroup, radios] of entries) {
            const card = this.talkgroupCard.create(talkgroup, radios);
            card.dataset.talkgroupId = talkgroup;
            if (filterState.excludedTalkgroups.has(talkgroup)) {
                card.classList.add('excluded');
            }
            container.appendChild(card);
        }
    }

}
