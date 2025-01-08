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
   git clone https://github.com/yourusername/docker-trunk-recorder-dashboard.git
   cd docker-trunk-recorder-dashboard

   # Copy example environment file
   cp .env.example .env

   # Create data directories
   mkdir -p data/mongodb data/talkgroups

   # Start the system
   docker compose up -d
   ```

3. Access the dashboard at http://localhost:3000

## Basic Configuration

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

## Multiple Systems Support

The dashboard supports monitoring multiple P25 systems simultaneously:

1. Create system-specific talkgroup files:
   ```
   data/talkgroups/
   ├── talkgroups.csv          # Default talkgroups
   └── [system]-talkgroups.csv # System-specific talkgroups
   ```

2. The system automatically:
   - Detects new P25 systems as they appear
   - Creates system-specific talkgroup files
   - Updates the system filter list in real-time
   - Routes events to appropriate talkgroup files
   - Saves unknown talkgroups to their system file

The system filter list is dynamically populated based on active systems:
- New systems are automatically added when detected
- Each system gets its own filter button with a friendly name
- System names are managed through aliases in data/system-alias.csv
- Filter list updates in real-time as new systems are discovered

### System Aliases
The dashboard uses a simple CSV file to map system shortnames to friendly display names:

1. File location: `data/system-alias.csv`
2. Format:
   ```
   shortName,alias
   butco,Butler
   warco,Warren
   hamco,Hamilton
   ```
3. Features:
   - Automatically adds new systems with generated aliases
   - Aliases can be customized by editing the CSV file
   - Changes are detected and applied immediately
   - Default aliases are generated from shortnames (e.g., "butco" → "Butler")

For example, if you're monitoring multiple P25 systems:
```
data/talkgroups/
├── talkgroups.csv          # Default talkgroups
├── hamco-talkgroups.csv    # Hamilton County P25
├── warco-talkgroups.csv    # Warren County P25
└── butco-talkgroups.csv    # Butler County P25
```

Each file contains only the talkgroups for that specific P25 system, and the system filter list will automatically update to show these systems as they become active.

## Security Warning ⚠️

**IMPORTANT**: This dashboard has no built-in authentication or encryption. By default, it accepts connections from any IP address and transmits data in plain text.

For safe operation:
- Run the dashboard only on your private network
- Use firewall rules to restrict access to trusted IPs
- Never expose the dashboard to the internet without proper security measures
- Consider using Tailscale for secure remote access

## Version History

### Version 0.2.1
- Added system alias support via data/system-alias.csv
- Added dynamic system filter list based on active systems
- Added real-time alias file monitoring
- Added automatic system name generation
- Improved system filter UI with friendly names
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
- [Issues](https://github.com/yourusername/docker-trunk-recorder-dashboard/issues): Bug reports and feature requests
