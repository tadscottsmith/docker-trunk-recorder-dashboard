import { systemAliasService } from '../services/system-alias-service.js';

export class FilterManager {
    constructor(talkgroupManager, onFilterChange) {
        this.talkgroupManager = talkgroupManager;
        this.onFilterChange = onFilterChange;
        this.pendingExclude = null;
        this.knownSystems = new Set(); // Track known systems
        this.systemButtons = new Map(); // Track system filter buttons
        
        // Load saved state or use defaults
        const savedState = this.loadFilterState();
        this.showActiveOnly = savedState.showActiveOnly ?? false;
        this.currentSort = savedState.currentSort ?? 'id';
        this.currentSystem = savedState.currentSystem ?? null;
        this.excludedTalkgroups = new Set(savedState.excludedTalkgroups ?? []);
        this.currentCategory = savedState.currentCategory ?? null;
        this.currentTag = savedState.currentTag ?? null;
        this.showUnassociated = savedState.showUnassociated ?? true;

        // Listen for system events from TalkgroupManager
        this.talkgroupManager.on('systemAdded', async (system) => {
            console.log('New system detected:', system);
            await this.handleNewSystem(system);
        });

        // Listen for system list updates
        window.socketIo.on('systemsUpdated', async () => {
            console.log('System list update received');
            await this.checkAndUpdateSystems();
        });

        // Listen for system alias updates
        window.socketIo.on('systemAliasesUpdated', async () => {
            console.log('System aliases updated, refreshing list');
            await this.checkAndUpdateSystems();
        });

        // Listen for talkgroups reloaded
        window.socketIo.on('talkgroupsReloaded', () => {
            this.checkAndUpdateSystems();
            this.updateFilterOptions();
        });
    }

    async handleNewSystem(system) {
        try {
            const displayName = await systemAliasService.getAlias(system);
            if (!this.knownSystems.has(system)) {
                this.knownSystems.add(system);
                await this.addSystemButton(system, displayName);
            }
        } catch (error) {
            console.error('Error handling new system:', error);
        }
    }

    async checkAndUpdateSystems() {
        try {
            // Get current systems
            const systems = await this.talkgroupManager.getKnownSystems();
            
            // Always refresh on first load
            if (this.knownSystems.size === 0) {
                console.log('Initial system list load...');
                this.knownSystems = new Set(systems.map(s => s.shortName));
                await this.refreshSystemList(systems);
                return;
            }

            // Check if the system list has changed
            const currentSystemSet = new Set(systems.map(s => s.shortName));
            const hasChanges = systems.length !== this.knownSystems.size ||
                             [...currentSystemSet].some(s => !this.knownSystems.has(s)) ||
                             [...this.knownSystems].some(s => !currentSystemSet.has(s));

            if (hasChanges) {
                console.log('System list changed, refreshing...');
                this.knownSystems = currentSystemSet;
                await this.refreshSystemList(systems);
            }
        } catch (error) {
            console.error('Error checking systems:', error);
        }
    }

    async refreshSystemList(systems) {
        try {
            const filterContainer = document.getElementById('systemFilter');
            if (!filterContainer) {
                console.error('System filter container not found');
                return;
            }

            console.log('Refreshing system list with:', systems);

            // Create document fragment for better performance
            const fragment = document.createDocumentFragment();
            
            // Create "All" button if it doesn't exist
            if (!this.systemButtons.has('all')) {
                const allButton = document.createElement('button');
                allButton.id = 'allSystems';
                allButton.className = 'system-button' + (!this.currentSystem ? ' active' : '');
                allButton.textContent = 'All';
                this.systemButtons.set('all', allButton);
                this.setupButtonHandler(allButton, null);
            }
            fragment.appendChild(this.systemButtons.get('all'));

            // Update existing buttons and create new ones
            for (const system of systems) {
                console.log('Processing system:', system);
                if (!this.systemButtons.has(system.shortName)) {
                    console.log('Creating new button for:', system.shortName);
                    const button = document.createElement('button');
                    button.id = `${system.shortName}Filter`;
                    button.className = 'system-button' + (this.currentSystem === system.shortName ? ' active' : '');
                    button.dataset.system = system.shortName;
                    button.textContent = system.displayName || system.shortName;
                    
                    this.setupButtonHandler(button, system.shortName);
                    this.systemButtons.set(system.shortName, button);
                    fragment.appendChild(button);
                } else {
                    console.log('Updating existing button for:', system.shortName);
                    const button = this.systemButtons.get(system.shortName);
                    button.textContent = system.displayName || system.shortName;
                    fragment.appendChild(button);
                }
            }

            // Replace content
            console.log('Updating filter container with new buttons');
            filterContainer.innerHTML = '';
            filterContainer.appendChild(fragment);
        } catch (error) {
            console.error('Error refreshing system list:', error);
        }
    }

    async addSystemButton(shortName, displayName, container = null) {
        const button = document.createElement('button');
        button.id = `${shortName}Filter`;
        button.className = 'system-button' + (this.currentSystem === shortName ? ' active' : '');
        button.dataset.system = shortName;
        button.textContent = displayName;
        
        this.setupButtonHandler(button, shortName);
        this.systemButtons.set(shortName, button);

        if (container) {
            container.appendChild(button);
        } else {
            const filterContainer = document.getElementById('systemFilter');
            if (filterContainer) {
                filterContainer.appendChild(button);
            }
        }
    }

    setupButtonHandler(button, system) {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            this.systemButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            this.currentSystem = system;
            this.talkgroupManager.setShortNameFilter(system);
            this.saveFilterState();
            this.onFilterChange();
        });
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
                this.saveFilterState();
                this.onFilterChange();
            });
        });
    }

    updateFilterOptions() {
        // Update category options
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            // Get unique categories from all metadata
            const categories = new Set();
            Object.values(this.talkgroupManager.metadata).forEach(metadata => {
                if (metadata?.category) {
                    categories.add(metadata.category);
                }
            });

            // Keep current selection
            const currentValue = categorySelect.value;

            // Clear and populate select
            categorySelect.innerHTML = '<option value="all">All Categories</option>';
            Array.from(categories).sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });

            // Restore selection if still valid, otherwise reset to 'all'
            if (Array.from(categories).includes(currentValue)) {
                categorySelect.value = currentValue;
            } else {
                categorySelect.value = 'all';
                this.currentCategory = null;
                this.saveFilterState();
            }
        }

        // Update tag options
        const tagSelect = document.getElementById('tagFilter');
        if (tagSelect) {
            // Get unique tags from all metadata
            const tags = new Set();
            Object.values(this.talkgroupManager.metadata).forEach(metadata => {
                if (metadata?.tag) {
                    tags.add(metadata.tag);
                }
            });

            // Keep current selection
            const currentValue = tagSelect.value;

            // Clear and populate select
            tagSelect.innerHTML = '<option value="all">All Tags</option>';
            Array.from(tags).sort().forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                tagSelect.appendChild(option);
            });

            // Restore selection if still valid, otherwise reset to 'all'
            if (Array.from(tags).includes(currentValue)) {
                tagSelect.value = currentValue;
            } else {
                tagSelect.value = 'all';
                this.currentTag = null;
                this.saveFilterState();
            }
        }
    }

    async setupFilterControls() {
        try {
            // Initial system list setup and filter options
            await this.checkAndUpdateSystems();
            this.updateFilterOptions();

            // Set up active filter toggle
            const filterButton = document.getElementById('filterButton');
            if (filterButton) {
                filterButton.addEventListener('click', () => this.toggleFilter());
                // Set initial state
                filterButton.classList.toggle('active', this.showActiveOnly);
                filterButton.textContent = this.showActiveOnly ? 'Show All' : 'Show Active Only';
            }

            // Set up sort buttons
            document.querySelectorAll('.sort-button').forEach(button => {
                button.addEventListener('click', () => this.setSort(button.dataset.sort));
                // Set initial state
                button.classList.toggle('active', button.dataset.sort === this.currentSort);
            });

            // Set up category filter
            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect) {
                // Set initial state
                if (this.currentCategory) {
                    categorySelect.value = this.currentCategory;
                }

                categorySelect.addEventListener('change', (e) => {
                    this.currentCategory = e.target.value === 'all' ? null : e.target.value;
                    this.saveFilterState();
                    this.onFilterChange();
                });
            }

            // Set up tag filter
            const tagSelect = document.getElementById('tagFilter');
            if (tagSelect) {
                // Set initial state
                if (this.currentTag) {
                    tagSelect.value = this.currentTag;
                }

                tagSelect.addEventListener('change', (e) => {
                    this.currentTag = e.target.value === 'all' ? null : e.target.value;
                    this.saveFilterState();
                    this.onFilterChange();
                });
            }

            // Set up unassociated toggle
            const unassociatedButton = document.getElementById('unassociatedButton');
            if (unassociatedButton) {
                unassociatedButton.addEventListener('click', () => this.toggleUnassociated());
                // Set initial state
                unassociatedButton.classList.toggle('active', this.showUnassociated);
                unassociatedButton.textContent = this.showUnassociated ? 'Hide Unknown' : 'Show Unknown';
            }

            // Set up hidden talkgroups button
            const hiddenButton = document.getElementById('hiddenTalkgroupsButton');
            if (hiddenButton) {
                hiddenButton.addEventListener('click', () => this.showHiddenTalkgroups());
                // Update initial count
                this.updateHiddenCount();
            }

            // Set up talkgroup exclusion
            document.addEventListener('contextmenu', (e) => {
                const talkgroupElement = e.target.closest('.talkgroup');
                if (talkgroupElement) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent other context menus
                    const talkgroupId = talkgroupElement.dataset.talkgroupId;
                    if (talkgroupId) {
                        this.confirmHideTalkgroup(talkgroupId);
                    } else {
                        console.error('No talkgroup ID found for element:', talkgroupElement);
                    }
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
        this.saveFilterState();
        this.onFilterChange();
    }

    toggleUnassociated() {
        this.showUnassociated = !this.showUnassociated;
        const button = document.getElementById('unassociatedButton');
        button.classList.toggle('active');
        button.textContent = this.showUnassociated ? 'Hide Unknown' : 'Show Unknown';
        this.saveFilterState();
        this.onFilterChange();
    }

    confirmHideTalkgroup(talkgroupId) {
        // Convert talkgroupId to string for consistent comparison
        talkgroupId = String(talkgroupId);
        const metadata = this.talkgroupManager.getMetadata(talkgroupId);
        const name = metadata.alphaTag || `Talkgroup ${talkgroupId}`;
        
        const dialog = document.getElementById('confirmDialog');
        const message = document.getElementById('confirmMessage');
        message.textContent = `Are you sure you want to hide ${name}?`;
        
        this.pendingExclude = talkgroupId;
        dialog.style.display = 'block';
    }

    toggleExcludedTalkgroup(talkgroupId) {
        // Convert talkgroupId to string for consistent comparison
        talkgroupId = String(talkgroupId);
        if (this.excludedTalkgroups.has(talkgroupId)) {
            this.excludedTalkgroups.delete(talkgroupId);
        } else {
            this.excludedTalkgroups.add(talkgroupId);
        }
        this.updateHiddenCount();
        this.saveFilterState();
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
        this.saveFilterState();
        this.onFilterChange();
    }

    getFilterState() {
        return {
            showActiveOnly: this.showActiveOnly,
            sortBy: this.currentSort,
            excludedTalkgroups: this.excludedTalkgroups,
            currentCategory: this.currentCategory,
            currentTag: this.currentTag,
            showUnassociated: this.showUnassociated
        };
    }

    saveFilterState() {
        const state = {
            showActiveOnly: this.showActiveOnly,
            currentSort: this.currentSort,
            currentSystem: this.currentSystem,
            excludedTalkgroups: Array.from(this.excludedTalkgroups),
            currentCategory: this.currentCategory,
            currentTag: this.currentTag,
            showUnassociated: this.showUnassociated
        };
        localStorage.setItem('filterState', JSON.stringify(state));
    }

    loadFilterState() {
        try {
            const savedState = localStorage.getItem('filterState');
            if (!savedState) return {};
            
            const state = JSON.parse(savedState);
            // Convert excludedTalkgroups to strings for consistent comparison
            if (state.excludedTalkgroups) {
                state.excludedTalkgroups = state.excludedTalkgroups.map(String);
            }
            return state;
        } catch (error) {
            console.error('Error loading filter state:', error);
            return {};
        }
    }
}
