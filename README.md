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
- Edit talkgroup information on the fly
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

   # Start the system
   docker compose up -d
   ```

3. Access the dashboard at http://localhost:3000

## Talkgroup Setup

### Option 1: Auto-Discovery (Default)
- Start using the dashboard right away
- System automatically tracks new talkgroups as they appear
- Edit talkgroup details through the web interface
- Changes are saved automatically

### Option 2: Radio Reference Import
1. Log in to [Radio Reference](https://www.radioreference.com)
2. Navigate to your radio system's database page
3. Download the talkgroup data (CSV format)
4. Place the file in the examples/ directory as talkgroups.csv
5. The system will automatically load the data

### Talkgroup Updates
- Edit talkgroups.csv directly - changes are detected automatically
- Use the web interface to update individual talkgroups
- New talkgroups are automatically added and saved
- Changes sync to all connected browsers in real-time

## Remote Setup

If trunk-recorder runs on a different machine:

1. On the trunk-recorder machine:
   ```bash
   # Create scripts directory
   mkdir -p /path/to/trunk-recorder/scripts

   # Copy logging scripts
   scp remote/* user@trunk-recorder-machine:/path/to/trunk-recorder/scripts/

   # Edit environment settings
   nano /path/to/trunk-recorder/scripts/.env
   # Set HTTP_MONGO_HOST to your dashboard machine's IP
   # Set HTTP_MONGO_PORT=3001

   # Make script executable
   chmod +x /path/to/trunk-recorder/scripts/log_mongo_http.sh
   ```

2. Configure trunk-recorder to use the logging script

## Troubleshooting

### No Data Appearing
- Check if trunk-recorder is sending events
- Verify the dashboard IP/port settings
- Look for connection errors in browser console

### Missing Talkgroup Information
- Verify talkgroups.csv exists in examples/ directory
- Check file format matches Radio Reference export
- Try reloading through the web interface

### Connection Issues
- Ensure ports 3000/3001 are accessible
- Check firewall settings
- Verify Docker containers are running:
  ```bash
  docker compose ps
  ```

## Security Considerations

- The dashboard accepts connections from any IP
- Use firewall rules to restrict access
- Consider using Tailscale for secure remote access
- Enable HTTPS if exposing to the internet

## Need Help?

- Check the [Issues](https://github.com/yourusername/docker-trunk-recorder-dashboard/issues) page
- Submit detailed bug reports with:
  * What you were doing
  * What you expected
  * What happened instead
  * Any error messages
