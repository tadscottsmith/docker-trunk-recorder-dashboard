# Docker Installation Guide

This guide provides instructions for installing and configuring the Trunk Recorder Dashboard using Docker.

## System Requirements

- Docker Engine 24.0 or later
- Docker Compose V2
- Git
- 1GB+ free disk space

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git
cd docker-trunk-recorder-dashboard
```

### 2. First-Time Setup

1. Create required directories:
   ```bash
   mkdir -p data/mongodb data/talkgroups
   chmod -R 755 data/
   ```

2. Create system alias file:
   ```bash
   echo "shortName,alias" > data/system-alias.csv
   ```

3. Initialize MongoDB and required collections:
   ```bash
   # Start MongoDB with initialization
   docker-compose --profile init up -d

   # Wait for initialization to complete
   docker-compose logs -f mongo-init
   # When you see "MongoDB initialization completed", press Ctrl+C
   ```

   The initialization process:
   - Sets up MongoDB replica set with proper hostname configuration
   - Creates required database and collections
   - Configures indexes for optimal performance
   - Sets up server parameters

### 3. Regular Operation

After initialization is complete, you can start/stop the services normally:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

The MongoDB replica set configuration persists in the data volume, so you don't need to run initialization again unless you delete the data directory.

### 4. Configure Trunk Recorder

1. Copy the logging script:
   ```bash
   cp remote/log_mongo_http.sh /path/to/trunk-recorder/
   chmod +x /path/to/trunk-recorder/log_mongo_http.sh
   ```

2. Configure environment variables for log_mongo_http.sh (optional):
   ```bash
   # Default settings shown - modify as needed
   export HTTP_HOST="localhost"     # Dashboard server address
   export HTTP_PORT="3001"         # Dashboard server port
   export DEBUG="false"           # Enable debug logging
   export CONN_TIMEOUT="1"        # Connection timeout in seconds
   export PROCESS_EVENTS="join,call"  # Event types to process
   ```

   Available event types for PROCESS_EVENTS:
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

### 5. Talkgroup Configuration

Choose one of these options:

1. Auto-Discovery (Default):
   - Start using the dashboard
   - System will automatically track new talkgroups
   - Talkgroups are saved to data/talkgroups/talkgroups.csv

2. Radio Reference Import:
   - Download talkgroup data from Radio Reference (CSV format)
   - Place in data/talkgroups/ as talkgroups.csv
   - For multiple systems: use shortname-talkgroups.csv naming format

### 6. Verify Installation

1. Check service status:
   ```bash
   docker-compose ps
   ```

2. Check logs:
   ```bash
   docker-compose logs -f
   ```

3. Verify web access:
   - Open http://localhost:3000
   - Dashboard should load and show "Waiting for events"

4. Test ingest service:
   ```bash
   curl http://localhost:3001/health
   ```

### Troubleshooting

1. MongoDB Issues:
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb

   # Check replica set status
   docker-compose exec mongodb mongosh --eval "rs.status()"
   ```

2. Permission Issues:
   ```bash
   # Fix data directory permissions
   sudo chown -R $UID:$GID data/
   chmod -R 755 data/
   ```

3. Service Issues:
   ```bash
   # View service logs
   docker-compose logs dashboard
   docker-compose logs ingest
   ```

### Maintenance

1. Update application:
   ```bash
   git pull
   docker-compose down
   docker-compose up -d --build
   ```

2. Backup data:
   ```bash
   # Stop services
   docker-compose down

   # Backup data
   tar -czf backup.tar.gz data/

   # Restart services
   docker-compose up -d
   ```

3. Reset MongoDB:
   If you need to completely reset MongoDB:
   ```bash
   # Stop all services
   docker-compose down

   # Remove MongoDB data
   sudo rm -rf data/mongodb/*

   # Reinitialize
   docker-compose --profile init up -d
