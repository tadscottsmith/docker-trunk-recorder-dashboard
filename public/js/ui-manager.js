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

        // Update category filter options if needed
        this.updateCategoryOptions();

        for (const [talkgroup, radios] of entries) {
            const card = this.talkgroupCard.create(talkgroup, radios);
            card.dataset.talkgroupId = talkgroup;
            if (filterState.excludedTalkgroups.has(talkgroup)) {
                card.classList.add('excluded');
            }
            container.appendChild(card);
        }
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('categoryFilter');
        if (!categorySelect) return;

        // Get unique categories from metadata
        const categories = new Set();
        Object.values(this.talkgroupManager.metadata).forEach(meta => {
            if (meta.category) categories.add(meta.category);
        });

        // Keep current selection
        const currentValue = categorySelect.value;

        // Update options
        categorySelect.innerHTML = '<option value="all">All Categories</option>';
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Restore selection if still valid
        if (Array.from(categories).includes(currentValue)) {
            categorySelect.value = currentValue;
        }
    }
}
