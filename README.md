# Trunk Recorder Dashboard

A real-time web dashboard for monitoring trunk-recorder radio activity. View live radio events, track talkgroups, and analyze historical data.

## Features

### Live Monitoring
- Real-time display of radio activity
- Color-coded event types (calls, grants, denials)
- Active call indicators
- Live call duration tracking

### Talkgroup Management
- Automatic talkgroup discovery and tracking
- Import talkgroup data from Radio Reference
- Auto-saves newly discovered talkgroups
- Automatic updates when talkgroup file changes
- Compatible with trunk-recorder talkgroup format

### Historical Data
- View activity from last 30 minutes to 12 hours
- Call frequency analysis
- Talkgroup-specific history
- Unique radio tracking

### User Interface
- Dark/Light theme support
- Sortable talkgroup list (by ID, recent activity, call frequency)
- Filter by talkgroup category
- Show/hide inactive talkgroups
- Mobile-friendly design

## Quick Installation

### Option 1: One-Click Installer (Recommended)
1. Download and run the installer:
   ```bash
   curl -O https://raw.githubusercontent.com/LumenPrima/docker-trunk-recorder-dashboard/ece2875/install.sh
   chmod +x install.sh
   ./install.sh
   ```
2. The installer will:
   - Download and let you configure the .env file
   - Set up the required directories
   - Build and start the Docker containers
   - Verify the installation

3. Access the dashboard at http://localhost:3000 (or your configured port)

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
   ```

## Configuration

### Environment Variables
Key settings in your .env file:

- `DASHBOARD_PORT`: External port for the dashboard (default: 3000)
- `SYSTEM_FILTERS`: Your system names and display names (format: shortName|displayName)
- `RADIOS_FILE`: Path to your radios.csv file (optional)

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

#### Option 2: Radio Reference Import
1. Log in to [Radio Reference](https://www.radioreference.com)
2. Navigate to your P25 system's database page
3. Download the talkgroup data (CSV format)
4. Place the file in the data/talkgroups directory as talkgroups.csv
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

## Version History

### Version 0.3.2
- Improved trunk-recorder compatibility
  - Updated CSV header format to match trunk-recorder
  - Added default Mode of 'D'
  - Added configurable external port
  - Added radios file support
- Improved installation process
  - Added environment configuration step
  - Allow editing .env before installation
  - Better error handling and progress indicators
- Updated documentation
  - Added configuration options
  - Improved installation instructions
  - Added trunk-recorder compatibility notes

### Version 0.3.1
- Added category filtering with dynamic options
- Added talkgroup hiding with confirmation dialog
- Added hidden talkgroups management modal
- Added unassociated talkgroup toggle
- Improved system alias handling
- Fixed system alias file preservation
- Added better logging for system operations
- Improved filter UI and styling
- Enhanced error handling and feedback

### Version 0.2.2
- Added comprehensive installation error checking
- Added automated diagnostic report generation
- Added system requirement validation
- Added container health monitoring
- Improved installation process reliability
- Enhanced troubleshooting documentation
- Changed default installation directory
- Added sanitized log collection

### Version 0.2.1
- Added multi-talkgroup metadata system with per-system files
- Added system alias support via data/system-alias.csv
- Added dynamic system filter list based on active systems
- Added real-time alias and talkgroup file monitoring
- Added automatic system name generation
- Improved system filter UI with friendly names
- Reorganized project into modular components
- Added comprehensive development documentation
- Improved error handling and logging
- Added more detailed event history and radio tracking
- Exposed more system metadata to users
- Removed hardcoded county filters

### Version 0.1.3
- Removed external dependencies from log_mongo_http.sh
- Improved error handling and logging
- Added input validation for environment variables
- Script now uses built-in tools instead of external utilities
- Reorganized project structure for better maintainability
- Added development environment with hot reloading
- Moved MongoDB data under project data directory
- Updated terminology to better reflect P25 systems

### Version 0.1.2
- Added multi-system talkgroup support
- Improved file watching and reloading
- Added dark/light theme support
- Enhanced error handling

### Version 0.1.1
- Added historical data viewing
- Improved real-time updates
- Added sorting and filtering options
- Enhanced UI responsiveness

### Version 0.1.0
- Initial release
- Basic radio monitoring
- Talkgroup management
- Real-time updates

## Documentation

- [Development Guide](docs/development.md): Project structure, setup, and technical details
- [Issues](https://github.com/LumenPrima/docker-trunk-recorder-dashboard/issues): Bug reports and feature requests
