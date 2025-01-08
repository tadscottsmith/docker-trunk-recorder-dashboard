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

### Option 1: One-Click Installer (Recommended)
1. Download and run the installer:
   ```bash
   curl -O https://raw.githubusercontent.com/LumenPrima/docker-trunk-recorder-dashboard/2feb067/install.sh
   chmod +x install.sh
   ./install.sh
   ```
2. Access the dashboard at http://localhost:3000

#### Troubleshooting and Bug Reports

The installer provides detailed feedback during the installation process and performs several pre-flight checks to ensure:
- Required tools are installed (Docker, Docker Compose, Git, curl)
- Docker service is running
- Sufficient disk space is available (minimum 1GB)
- Network connectivity to GitHub
- Directory permissions are correct
- No conflicting installations exist

If any issues are detected:
1. The installer will display specific error messages
2. Provide guidance on how to resolve the issue
3. Automatically generate a diagnostic report if needed

To manually generate a diagnostic report:
```bash
cd tr-dashboard
./install.sh --logs
```

The diagnostic report includes:
- Docker logs and container status
- System information and versions
- MongoDB diagnostic data
- Sanitized environment configuration (sensitive data removed)
- Installation error logs
- Container health checks

The report is packaged as a tar.gz archive for maximum compatibility across systems.

Common Issues and Solutions:
1. Docker service not running:
   ```bash
   sudo systemctl start docker
   ```

2. Permission errors:
   - Don't run installer as root/sudo
   - Ensure current user is in docker group
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. Network connectivity:
   - Check internet connection
   - Verify GitHub is accessible
   - Check firewall settings

4. Disk space issues:
   - Free up at least 1GB space
   - Run `docker system prune` to clean old images

Attach the generated tar.gz archive when reporting issues on GitHub for faster troubleshooting.

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
   git clone https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git tr-dashboard
   cd tr-dashboard

   # Copy example environment file
   cp .env.example .env

   # Create data directories
   mkdir -p data/mongodb data/talkgroups

   # Start the system
   docker compose up -d
   ```

3. Access the dashboard at http://localhost:3000

## Database Configuration

### MongoDB Setup
The system uses a dedicated initialization script (mongo-init.js) that:
- Initializes MongoDB with replica set configuration
- Creates required collections with schema validation
- Handles existing collections gracefully
- Sets up indexes for optimal query performance
- Configures diagnostic data collection to minimize warnings
- Validates data structure on insertion
- Provides error handling for initialization issues
- Shows detailed progress during initialization
- Logs all database operations for troubleshooting

The initialization script is mounted into the container and executed as a one-time operation during installation, ensuring consistent database configuration across deployments. The script runs in a dedicated profile to prevent accidental reinitialization during normal operation. All required data directories and files are created with proper permissions during setup. The MongoDB schema validation ensures data consistency by validating required fields and field types.

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

### Recommended Security Measures

#### Network Security
- Run the dashboard only on your private network
- Use firewall rules to restrict access to trusted IPs
- Never expose the dashboard to the internet without proper security measures

#### Secure Remote Access
1. Install Tailscale:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2. Access dashboard via Tailscale IP:
   ```bash
   http://<tailscale-ip>:3000
   ```

#### Reverse Proxy Setup
1. Install Nginx:
   ```bash
   sudo apt install nginx
   ```
2. Create proxy configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/trunk-dashboard
   ```
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate /etc/ssl/certs/yourdomain.crt;
       ssl_certificate_key /etc/ssl/private/yourdomain.key;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Enable configuration:
   ```bash
   sudo ln -s /etc/nginx/sites-available/trunk-dashboard /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

#### HTTPS Setup
1. Obtain SSL certificate:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```
2. Configure automatic renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

#### Additional Security Recommendations
- Use a VPN for remote access
- Implement IP whitelisting
- Regularly update Docker images
- Monitor access logs
- Consider implementing basic authentication

## Version History

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
