# Trunk Recorder Dashboard

A real-time web dashboard for monitoring trunk-recorder radio activity. View live radio events, track talkgroups, and analyze historical data.

## Features

### Live Monitoring
- Real-time display of radio activity with color-coded events
- Active call indicators with live duration tracking
- Automatic system recovery and status monitoring

### Talkgroup Management
- Multi-system support with automatic talkgroup discovery
- Import from Radio Reference or auto-generate from activity
- Tag-based organization with category filtering
- Compatible with trunk-recorder CSV format

### System Features
- Dynamic system alias management and configuration
- Per-system talkgroup file support
- Real-time file monitoring and updates

### Historical Analysis
- Configurable time ranges from 30 minutes to 12 hours
- Call frequency analysis and event filtering
- Talkgroup-specific history with radio tracking

### User Interface
- Dark/Light theme with mobile-friendly design
- Sortable talkgroup list by various metrics
- Show/hide inactive talkgroups

## Quick Installation

### Option 1: One-Click Installer (Recommended)
1. Create a new directory and run the installer:
   ```bash
   mkdir trunk-dashboard && cd trunk-dashboard
   curl -O https://raw.githubusercontent.com/LumenPrima/docker-trunk-recorder-dashboard/main/scripts/install.sh && chmod +x install.sh && ./install.sh
   ```
2. The installer will:
   - Download and let you configure the .env file
   - Set up the required directories
   - Build and start the Docker containers
   - Verify the installation
   - Provide improved error handling and validation

3. Configure your talkgroups:
   - Option 1: Let the system auto-discover talkgroups as they appear
   - Option 2: Download CSV from Radio Reference and place in data/talkgroups/

4. Configure trunk-recorder:
   - Copy log_mongo_http.sh to your trunk-recorder directory
   - Add unitScript to your trunk-recorder config.json

5. Access the dashboard at http://localhost:3000 (or your configured port)

### Option 2: Manual Installation
1. Install Docker on your system:
   - [Docker Desktop for Windows/Mac](https://www.docker.com/products/docker-desktop/)
   - For Linux:
     ```bash
     sudo apt update
     sudo apt install docker.io docker-compose
     sudo systemctl start docker
     sudo systemctl enable docker
     sudo usermod -aG docker $USER  # Log out and back in after this
     ```

2. Download and start the dashboard:
   ```bash
   # Get the code
   git clone https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git
   cd docker-trunk-recorder-dashboard

   # Copy and edit environment file
   cp .env.example .env
   nano .env  # Configure your settings

   # Create data directories
   mkdir -p data/mongodb data/talkgroups

   # Start the system
   docker compose up -d
   
## Configuration

### Environment Variables
Key settings in your .env file:

- `DASHBOARD_PORT`: External port for the dashboard (default: 3000)
- `SYSTEM_FILTERS`: Your system names and display names (format: shortName|displayName)
- `RADIOS_FILE`: Path to your radios.csv file (optional, not yet implemented) 

Example .env:
```bash
# Dashboard Configuration
DASHBOARD_PORT=3000

# System Configuration
SYSTEM_FILTERS=hamco|Hamilton P25,warco|Warren P25

# Optional: Path to radios file
RADIOS_FILE=/path/to/radios.csv
```

### Talkgroup Setup

#### Option 1: Auto-Discovery (Default)
- Start using the dashboard right away
- System automatically tracks new talkgroups as they appear
- Unknown talkgroups are saved to talkgroups.csv
- Talkgroups can be modified and saved in realtime
- The system aliases for filtering can be modified in realtime

#### Option 2: Radio Reference Import
1. Log in to [Radio Reference](https://www.radioreference.com)
2. Navigate to your P25 system's database page
3. Download the talkgroup data (CSV format)
4. Place the file in the data/talkgroups directory as talkgroups.csv
4b. For multiple systems, use the filname shortname-talkgroups.csv for each system. (untested)
5. The system will automatically load the data

### Trunk Recorder Setup

1. Copy the logging script:
   ```bash
   cp remote/log_mongo_http.sh /path/to/trunk-recorder/
   chmod +x /path/to/trunk-recorder/log_mongo_http.sh
   ```

2. Add to trunk-recorder's config.json:
   ```json
   {
       "shortName": "your-system-name",
       "control_channels": [851000000,852000000],
       "type": "p25",
       "modulation": "qpsk",
       "talkgroupsFile": "talkgroups.csv",
       "unitScript": "./log_mongo_http.sh"
   }
   ```

## Documentation

### Installation & Setup
- [Quick Installation](README.md#quick-installation): One-click installer and Docker setup
- [Manual Installation](docs/installation.md): Detailed guide for non-Docker setup
- [Configuration](README.md#configuration): Environment variables and system setup

### Development & Reference
- [Development Guide](docs/development.md): Project structure and technical details
- [Changelog](docs/changelog.md): Version history and updates
- [Issues](https://github.com/LumenPrima/docker-trunk-recorder-dashboard/issues): Bug reports and feature requests
