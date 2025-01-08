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
        this.pendingExclude = null;

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
        
        // Create buttons for encountered systems
        Array.from(this.talkgroupManager.encounteredSystems).sort().forEach(system => {
            const button = document.createElement('button');
            button.id = `${system}Filter`;
            button.className = `system-button${currentActiveSystem === system ? ' active' : ''}`;
            button.dataset.system = system;
            button.textContent = system;
            filterContainer.appendChild(button);
        });

        // Set up click handlers
        this.setupSystemButtonHandlers();
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

            // Set up hidden talkgroups button
            const hiddenButton = document.getElementById('hiddenTalkgroupsButton');
            if (hiddenButton) {
                hiddenButton.addEventListener('click', () => this.showHiddenTalkgroups());
            }

            // Set up talkgroup exclusion
            document.addEventListener('contextmenu', (e) => {
                const talkgroupElement = e.target.closest('.talkgroup');
                if (talkgroupElement) {
                    e.preventDefault();
                    const talkgroupId = talkgroupElement.dataset.talkgroupId;
                    this.confirmHideTalkgroup(talkgroupId);
                }
            });

            // Set up confirmation dialog
            const confirmYes = document.getElementById('confirmYes');
            const confirmNo = document.getElementById('confirmNo');
            if (confirmYes) {
                confirmYes.addEventListener('click', () => {
                    if (this.pendingExclude) {
                        this.toggleExcludedTalkgroup(this.pendingExclude);
                        this.pendingExclude = null;
                    }
                    document.getElementById('confirmDialog').style.display = 'none';
                });
            }
            if (confirmNo) {
                confirmNo.addEventListener('click', () => {
                    this.pendingExclude = null;
                    document.getElementById('confirmDialog').style.display = 'none';
                });
            }

            // Set up hidden talkgroups modal close
            const closeModal = document.querySelector('#hiddenTalkgroupsModal .close-modal');
            if (closeModal) {
                closeModal.addEventListener('click', () => {
                    document.getElementById('hiddenTalkgroupsModal').style.display = 'none';
                });
            }

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

    confirmHideTalkgroup(talkgroupId) {
        const metadata = this.talkgroupManager.getMetadata(talkgroupId);
        const name = metadata.alphaTag || `Talkgroup ${talkgroupId}`;
        
        const dialog = document.getElementById('confirmDialog');
        const message = document.getElementById('confirmMessage');
        message.textContent = `Are you sure you want to hide ${name}?`;
        
        this.pendingExclude = talkgroupId;
        dialog.style.display = 'block';
    }

    toggleExcludedTalkgroup(talkgroupId) {
        if (this.excludedTalkgroups.has(talkgroupId)) {
            this.excludedTalkgroups.delete(talkgroupId);
        } else {
            this.excludedTalkgroups.add(talkgroupId);
        }
        this.updateHiddenCount();
        this.onFilterChange();
    }

    updateHiddenCount() {
        const button = document.getElementById('hiddenTalkgroupsButton');
        if (button) {
            button.textContent = `Hidden Talkgroups (${this.excludedTalkgroups.size})`;
        }
    }

    showHiddenTalkgroups() {
        const modal = document.getElementById('hiddenTalkgroupsModal');
        const list = document.getElementById('hiddenTalkgroupsList');
        list.innerHTML = '';

        if (this.excludedTalkgroups.size === 0) {
            list.innerHTML = '<div class="hidden-talkgroup-item">No hidden talkgroups</div>';
            modal.style.display = 'block';
            return;
        }

        this.excludedTalkgroups.forEach(talkgroupId => {
            const metadata = this.talkgroupManager.getMetadata(talkgroupId);
            const item = document.createElement('div');
            item.className = 'hidden-talkgroup-item';
            
            const info = document.createElement('div');
            info.className = 'hidden-talkgroup-info';
            info.innerHTML = `
                <div class="hidden-talkgroup-title">${metadata.alphaTag || `Talkgroup ${talkgroupId}`}</div>
                <div class="hidden-talkgroup-description">${metadata.description || 'No description'}</div>
            `;

            const unhideButton = document.createElement('button');
            unhideButton.className = 'unhide-button';
            unhideButton.textContent = 'Unhide';
            unhideButton.onclick = () => {
                this.toggleExcludedTalkgroup(talkgroupId);
                if (this.excludedTalkgroups.size === 0) {
                    modal.style.display = 'none';
                } else {
                    item.remove();
                }
            };

            item.appendChild(info);
            item.appendChild(unhideButton);
            list.appendChild(item);
        });

        modal.style.display = 'block';
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
            sortBy: this.currentSort,
            excludedTalkgroups: this.excludedTalkgroups,
            currentCategory: this.currentCategory,
            showUnassociated: this.showUnassociated
        };
    }
}
