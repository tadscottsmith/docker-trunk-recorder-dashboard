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

    async updateUI() {
        // Refresh system list when UI updates
        this.filterManager.refreshSystemList();

        const container = document.getElementById('talkgroups');
        container.innerHTML = '';

        const filterState = this.filterManager.getFilterState();
        const entries = this.talkgroupManager.getTalkgroupEntries(filterState);

        // Create all cards asynchronously
        const cardPromises = entries.map(async ([talkgroup, radios]) => {
            const card = await this.talkgroupCard.create(talkgroup, radios);
            card.dataset.talkgroupId = talkgroup;
            if (filterState.excludedTalkgroups.has(talkgroup)) {
                card.classList.add('excluded');
            }
            return card;
        });

        // Wait for all cards to be created
        const cards = await Promise.all(cardPromises);
        
        // Add all cards to container
        cards.forEach(card => container.appendChild(card));
    }

}
