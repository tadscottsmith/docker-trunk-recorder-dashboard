export class TalkgroupCard {
    constructor(talkgroupManager) {
        this.talkgroupManager = talkgroupManager;
    }

    async create(talkgroup, radios) {
        const talkgroupDiv = document.createElement('div');
        const glowState = this.talkgroupManager.getGlowState(talkgroup);
        const glowClass = glowState ? ` glow-${glowState}` : '';
        talkgroupDiv.className = `talkgroup${glowClass}`;
        
        // Add click handler for history view
        talkgroupDiv.addEventListener('click', () => this.showTalkgroupHistory(talkgroup));
        
        const header = await this.createHeader(talkgroup);
        talkgroupDiv.appendChild(header);
        talkgroupDiv.appendChild(this.createRadioContainer(talkgroup, radios));
        
        return talkgroupDiv;
    }

    async createHeader(talkgroup) {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'talkgroup-header';
        
        const metadata = this.talkgroupManager.getMetadata(talkgroup);
        const timestamp = this.talkgroupManager.getTimestamp(talkgroup);
        const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
        const stats = this.talkgroupManager.getCallStats(talkgroup);
        
        // Get system alias if needed
        let systemName = '';
        if (metadata.shortName) {
            systemName = await window.systemAliasService.getAlias(metadata.shortName);
        }
        
        headerDiv.innerHTML = `
            <div class="timestamp">${formattedTime}</div>
            <div>
                <span class="talkgroup-title">${metadata.alphaTag || `Talkgroup ${talkgroup}`}</span>
                <span class="talkgroup-tag">${metadata.tag || 'Unknown'}</span>
                ${metadata.shortName ? `<span class="talkgroup-system">${systemName}</span>` : ''}
            </div>
            <div>
                <span class="talkgroup-description">${metadata.description || 'Unknown'}</span>
            </div>
            <div>
                <span class="talkgroup-category">${metadata.category || 'Unknown Category'}</span>
            </div>
            <div class="stats">
                <div class="stat-item">
                    Calls: ${stats.count || 0}
                </div>
                <div class="stat-item">
                    ${this.formatCallPeriod(stats.timestamps)}
                </div>
            </div>
        `;
        
        return headerDiv;
    }

    createRadioContainer(talkgroup, radios) {
        const radioContainer = document.createElement('div');
        radioContainer.className = 'radio-container';
        
        radios.forEach(radioId => {
            const radioDiv = document.createElement('div');
            const state = this.talkgroupManager.getRadioState(talkgroup, radioId);
            radioDiv.className = `radio${state ? ` event-${state}` : ''}`;
            radioDiv.title = `Radio ID: ${radioId}${state ? ` (${state})` : ''}`;
            radioContainer.appendChild(radioDiv);
        });
        
        return radioContainer;
    }

    formatCallPeriod(timestamps) {
        if (!timestamps || timestamps.length === 0) {
            return 'No calls';
        }
        
        const sorted = timestamps.sort();
        const first = new Date(sorted[0]);
        const last = new Date(sorted[sorted.length - 1]);
        
        const formatOptions = {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        };
        
        return `${first.toLocaleTimeString([], formatOptions)} - ${last.toLocaleTimeString([], formatOptions)}`;
    }

    async showTalkgroupHistory(talkgroup) {
        const modal = document.getElementById('historyModal');
        const modalTitle = document.getElementById('modalTitle');
        const affiliatedRadios = document.getElementById('affiliatedRadios');
        const eventHistory = document.getElementById('eventHistory');
        const metadata = this.talkgroupManager.getMetadata(talkgroup);

        // Set modal title
        modalTitle.textContent = `${metadata.alphaTag || `Talkgroup ${talkgroup}`} History`;

        try {
            // Fetch talkgroup history
            const response = await fetch(`/api/talkgroup/${talkgroup}/history`);
            const data = await response.json();

            // Display affiliated radios
            affiliatedRadios.innerHTML = data.uniqueRadios
                .map(radioId => `
                    <div class="radio-item">
                        Radio ${radioId}
                    </div>
                `)
                .join('');

            // Display event history
            eventHistory.innerHTML = data.events
                .map(event => `
                    <div class="event-item">
                        <div>
                            <span class="event-type ${event.eventType}">${event.eventType}</span>
                            <span>Radio ${event.radioID}</span>
                        </div>
                        <span class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                `)
                .join('');

            // Show modal
            modal.style.display = 'block';

            // Add close handler
            const closeBtn = modal.querySelector('.close-modal');
            closeBtn.onclick = () => modal.style.display = 'none';

            // Close on outside click
            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };

        } catch (error) {
            console.error('Error fetching talkgroup history:', error);
        }
    }
}
