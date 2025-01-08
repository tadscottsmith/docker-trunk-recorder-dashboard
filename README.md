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
   curl -O https://raw.githubusercontent.com/LumenPrima/docker-trunk-recorder-dashboard/03fc9cd/install.sh
   chmod +x install.sh
   ./install.sh
   ```
2. Access the dashboard at http://localhost:3000

[Previous content up to Version History section...]

## Version History

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
