# Version History

### Version 0.3.8.1
- Fixed system filter button updates
  - Added proper system change detection
  - Reduced unnecessary UI updates
  - Fixed initial system list population

### Version 0.3.8
- Improved Docker data handling
  - Fixed data directory persistence in Docker volumes
  - Added proper user permissions for mounted volumes
  - Added runtime directory initialization
- Improved system handling
  - Removed predefined system filters
  - Optimized system filter button updates to prevent flickering
  - Added system list change detection to reduce UI updates

### Version 0.3.7.2
- Fixed system alias file handling to properly preserve existing aliases when adding new systems

### Version 0.3.7.1
- Fixed talkgroup file header validation to properly check for "Decimal" and "Alpha Tag" columns

### Version 0.3.7
- Improved data file handling
  - Removed talkgroups.csv and system-alias.csv from repository
  - Added automatic file creation with proper headers
  - Updated .gitignore to prevent data file tracking
  - Fixed system alias file updates
  - Fixed crash when talkgroups.csv is missing
  - Improved error handling for missing files

### Version 0.3.6
- Updated installation to use main branch instead of feature branch
- Added GitHub repository link to dashboard header
- Improved documentation organization
  - Moved changelog to docs/changelog.md
  - Streamlined feature documentation
  - Enhanced installation instructions with configuration steps

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
