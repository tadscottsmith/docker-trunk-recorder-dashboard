# Docker Trunk Recorder Dashboard

A containerized dashboard for visualizing trunk-recorder radio activity. This repository provides a simplified Docker setup for running the trunk-recorder dashboard.

## Quick Start

1. Install Docker:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (logout/login required after this)
sudo usermod -aG docker $USER
```

2. Clone and start the dashboard:
```bash
# Clone repository
git clone https://github.com/yourusername/docker-trunk-recorder-dashboard.git
cd docker-trunk-recorder-dashboard

# Create environment file
cp .env.example .env

# Start containers
docker compose up -d
```

3. Access the dashboard at http://localhost:3000

## Talkgroup Configuration

The dashboard supports two ways to manage talkgroup metadata:

1. Auto-Population (Default):
   - The system automatically tracks all talkgroups it encounters
   - Creates/updates a talkgroups.csv file with basic entries
   - Updates every hour with any new talkgroups discovered
   - Provides a starting point for manual updates

2. Manual Configuration:
   - Download your system's data from [Radio Reference](https://www.radioreference.com)
   - Format as CSV with required columns: decimal,alphaTag
   - Optional columns: hex,mode,description,tag,category
   - See examples/talkgroups.csv for format example

Example talkgroups.csv:
```csv
decimal,hex,alphaTag,mode,description,tag,category
1001,3E9,DISP-1,D,Primary Dispatch,Dispatch,Public Safety
1002,3EA,TAC-1,D,Tactical Channel 1,Tactical,Public Safety
```

### Configuration Options:

1. Use Auto-Population (Default):
   - No configuration needed
   - System will create talkgroups.csv automatically
   - File updates hourly with new talkgroups
   - Edit file anytime to add metadata

2. Start with Radio Reference Data:
   - Place your CSV file in the repository
   - Add the file path to your .env:
     ```ini
     TALKGROUP_FILE=/app/talkgroups.csv
     ```
   - New talkgroups will still be auto-added
   - Restart the containers:
     ```bash
     docker compose restart
     ```

3. Update Talkgroup Information:
   - Edit talkgroups.csv directly
   - System will load changes on next restart
   - Or use the API endpoint:
     ```bash
     # Update talkgroup 1001
     curl -X POST http://localhost:3000/api/talkgroups/1001 \
       -H "Content-Type: application/json" \
       -d '{
         "alphaTag": "DISP-1",
         "description": "Primary Dispatch",
         "tag": "Dispatch",
         "category": "Public Safety"
       }'
     ```

## Remote Logging Setup

If trunk-recorder is running on a different machine:

1. Copy the logging files to trunk-recorder machine:
```bash
# Create scripts directory
mkdir -p /path/to/trunk-recorder/scripts

# Copy files from remote/ directory
scp remote/* user@trunk-recorder-machine:/path/to/trunk-recorder/scripts/
```

2. Configure the .env file on trunk-recorder machine:
```bash
# Edit .env with your dashboard machine's IP
HTTP_MONGO_HOST=your-dashboard-ip
HTTP_MONGO_PORT=3001
DEBUG=false
```

3. Make script executable:
```bash
chmod +x /path/to/trunk-recorder/scripts/log_mongo_http.sh
```

4. Configure trunk-recorder to use the script.

## Directory Structure

```
.
├── docker-compose.yml      # Container orchestration
├── Dockerfile             # Dashboard container
├── Dockerfile.ingest      # HTTP ingest service container
├── .env.example          # Environment template
├── examples/             # Example files
│   └── talkgroups.csv   # Example talkgroup data format
├── remote/               # Files for trunk-recorder machine
│   ├── log_mongo_http.sh # Logging script
│   └── .env             # Environment template for remote
└── README.md            # This file
```

## Environment Variables

Dashboard machine (.env):
```ini
# MongoDB Configuration
MONGODB_URI=mongodb://mongodb:27017
DB_NAME=trunk_recorder
COLLECTION_NAME=radio_events

# Dashboard Configuration
PORT=3000

# HTTP Ingest Service Configuration
HTTP_MONGO_PORT=3001

# Optional Configuration
TALKGROUP_FILE=/app/talkgroups.csv  # Path to talkgroup CSV file
```

Trunk-recorder machine (remote/.env):
```ini
# HTTP Ingest Service Configuration
HTTP_MONGO_HOST=dashboard-machine-ip
HTTP_MONGO_PORT=3001
DEBUG=false
```

## Container Services

1. MongoDB (internal)
- Stores radio events
- Configured as replica set for change streams
- Data persisted in Docker volume

2. Dashboard (port 3000)
- Web interface for visualizing events
- Real-time updates via WebSocket
- Historical data viewing
- Optional talkgroup metadata display

3. HTTP Ingest (port 3001)
- Receives events from trunk-recorder
- Handles deduplication
- Stores events in MongoDB

## Maintenance

View logs:
```bash
# All containers
docker compose logs -f

# Specific container
docker compose logs -f dashboard
docker compose logs -f ingest
docker compose logs -f mongodb
```

Update containers:
```bash
docker compose pull
docker compose up -d
```

Stop everything:
```bash
docker compose down
```

## Troubleshooting

1. Check container status:
```bash
docker compose ps
```

2. Verify logging script connection:
```bash
# On trunk-recorder machine
curl http://dashboard-ip:3001/health
```

3. Test event logging:
```bash
# On trunk-recorder machine
./log_mongo_http.sh --debug "TestSystem" "12345" "grant" "6643"
```

4. Common issues:
- If dashboard shows no data:
  * Check MongoDB connection in dashboard logs
  * Verify events are being received by ingest service
  * Check WebSocket connection in browser console

- If logging fails:
  * Verify dashboard IP is correct in remote .env
  * Check if ports 3000/3001 are accessible
  * Enable DEBUG=true in remote .env for detailed logs

- If talkgroup metadata is missing:
  * Check if TALKGROUP_FILE path is correct
  * Verify CSV file format matches example
  * Check dashboard logs for CSV parsing errors

## Security Notes

- The HTTP ingest service accepts connections from any IP
- Consider using firewall rules to restrict access
- Use HTTPS if deploying over the internet
- Tailscale recommended for secure communication between machines
