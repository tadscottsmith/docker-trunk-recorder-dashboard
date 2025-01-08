export class FilterManager {
    constructor(talkgroupManager, onFilterChange) {
        this.talkgroupManager = talkgroupManager;
        this.onFilterChange = onFilterChange;
        this.showActiveOnly = false;
        this.currentSort = 'id';
        this.currentSystem = null;
        this.excludedTalkgroups = new Set();
        this.currentCategory = null;
        this.showUnassociated = true;

        // Listen for system list updates
        window.socketIo.on('systemsUpdated', () => {
            this.refreshSystemList();
        });

        // Listen for talkgroups reloaded to check for new systems
        window.socketIo.on('talkgroupsReloaded', () => {
            this.refreshSystemList();
        });
    }

    async refreshSystemList() {
        try {
            // Get current system list
            const response = await fetch('/api/config');
            const config = await response.json();
            
            // Get and clear the system filter container
            const filterContainer = document.getElementById('systemFilter');
            const currentActiveSystem = filterContainer.querySelector('.system-button.active')?.dataset.system;
            filterContainer.innerHTML = '';
            
            // Create "All" button
            const allButton = document.createElement('button');
            allButton.id = 'allSystems';
            allButton.className = `system-button${!currentActiveSystem ? ' active' : ''}`;
            allButton.textContent = 'All';
            filterContainer.appendChild(allButton);
            
            // Create system-specific buttons
            config.systemFilters.forEach(({ shortName, displayName }) => {
                const button = document.createElement('button');
                button.id = `${shortName}Filter`;
                button.className = `system-button${currentActiveSystem === shortName ? ' active' : ''}`;
                button.dataset.system = shortName;
                button.textContent = displayName;
                filterContainer.appendChild(button);
            });

            // Set up click handlers
            this.setupSystemButtonHandlers();

        } catch (error) {
            console.error('Error refreshing system list:', error);
        }
    }

    setupSystemButtonHandlers() {
        const systemButtons = document.querySelectorAll('.system-button');
        systemButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                systemButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                
                if (button.id === 'allSystems') {
                    this.currentSystem = null;
                    this.talkgroupManager.clearShortNameFilter();
                } else {
                    this.currentSystem = button.dataset.system;
                    this.talkgroupManager.setShortNameFilter(this.currentSystem);
                }
                this.onFilterChange();
            });
        });
    }

    async setupFilterControls() {
        try {
            // Initial system list setup
            await this.refreshSystemList();

            // Set up active filter toggle
            const filterButton = document.getElementById('filterButton');
            if (filterButton) {
                filterButton.addEventListener('click', () => this.toggleFilter());
            }

            // Set up sort buttons
            document.querySelectorAll('.sort-button').forEach(button => {
                button.addEventListener('click', () => this.setSort(button.dataset.sort));
            });

            // Set up category filter
            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect) {
                categorySelect.addEventListener('change', (e) => {
                    this.currentCategory = e.target.value === 'all' ? null : e.target.value;
                    this.onFilterChange();
                });
            }

            // Set up unassociated toggle
            const unassociatedButton = document.getElementById('unassociatedButton');
            if (unassociatedButton) {
                unassociatedButton.addEventListener('click', () => this.toggleUnassociated());
            }

            // Set up talkgroup exclusion
            document.addEventListener('contextmenu', (e) => {
                const talkgroupElement = e.target.closest('.talkgroup');
                if (talkgroupElement) {
                    e.preventDefault();
                    const talkgroupId = talkgroupElement.dataset.talkgroupId;
                    this.toggleExcludedTalkgroup(talkgroupId);
                }
            });

        } catch (error) {
            console.error('Error setting up filters:', error);
        }
    }

    toggleFilter() {
        this.showActiveOnly = !this.showActiveOnly;
        const button = document.getElementById('filterButton');
        button.classList.toggle('active');
        button.textContent = this.showActiveOnly ? 'Show All' : 'Show Active Only';
        this.onFilterChange();
    }

    toggleUnassociated() {
        this.showUnassociated = !this.showUnassociated;
        const button = document.getElementById('unassociatedButton');
        button.classList.toggle('active');
        button.textContent = this.showUnassociated ? 'Hide Unassociated' : 'Show Unassociated';
        this.onFilterChange();
    }

    toggleExcludedTalkgroup(talkgroupId) {
        if (this.excludedTalkgroups.has(talkgroupId)) {
            this.excludedTalkgroups.delete(talkgroupId);
        } else {
            this.excludedTalkgroups.add(talkgroupId);
        }
        this.onFilterChange();
    }

    setSort(sortBy) {
        this.currentSort = sortBy;
        // Update active state of sort buttons
        document.querySelectorAll('.sort-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortBy);
        });
        this.onFilterChange();
    }

    getFilterState() {
        return {
            showActiveOnly: this.showActiveOnly,
            currentSort: this.currentSort,
            excludedTalkgroups: this.excludedTalkgroups,
            currentCategory: this.currentCategory,
            showUnassociated: this.showUnassociated
        };
    }
}
