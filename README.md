# Trunk Recorder Dashboard

⚠️ **PRE-ALPHA WARNING**: This project is in pre-alpha stage and is not ready for production use. Features and APIs may change significantly between versions.

A real-time web dashboard for monitoring trunk-recorder radio activity. View live radio events, track talkgroups, and analyze historical data.

## Quick Installation

### Option 1: One-Click Installer (Recommended)
1. Create a new directory and run the installer:
   ```bash
   mkdir tr-dashboard && cd tr-dashboard && curl -O https://raw.githubusercontent.com/LumenPrima/docker-trunk-recorder-dashboard/main/scripts/install.sh && chmod +x install.sh && ./install.sh
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

   Optional: If you're monitoring many talkgroups or seeing "too many open files" errors on Linux, you may want to increase the system's file handle limits:
   ```bash
   # Increase system file handle limits
   sudo sh -c 'echo "* soft nofile 64000" >> /etc/security/limits.conf'
   sudo sh -c 'echo "* hard nofile 64000" >> /etc/security/limits.conf'
   sudo sh -c 'echo "session required pam_limits.so" >> /etc/pam.d/common-session'
   
   # Apply changes immediately for current user
   ulimit -n 64000
   
   # Verify new limits
   ulimit -n
   ```
   
   Note: The script uses file descriptors for network connections. The default limits are usually sufficient, but busy systems with many simultaneous events might need higher limits. You'll need to log out and back in for permanent changes to take effect.

2. Configure script behavior (optional):
   ```bash
   # Default settings shown - modify as needed
   export HTTP_HOST="localhost"     # Dashboard server address
   export HTTP_PORT="3001"         # Dashboard server port
   export DEBUG="false"           # Enable debug logging
   export CONN_TIMEOUT="1"        # Connection timeout in seconds
   export PROCESS_EVENTS="join,call"  # Event types to process
   ```

   By default, the script only processes 'join' and 'call' events to minimize system load, reduce network traffic, and limit the number of open files. These events provide the essential information for tracking radio activity. Additional event types can be enabled if needed:
   - on: Radio unit registration
   - join: Talk group affiliation
   - off: Radio unit deregistration
   - ackresp: Acknowledgment response
   - call: Radio transmission
   - data: Data channel grant
   - ans_req: Unit-unit answer request
   - location: Location registration response

3. Add to trunk-recorder's config.json:
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
