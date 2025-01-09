# Manual Installation Guide (Without Docker)

This guide provides detailed instructions for installing and configuring the Trunk Recorder Dashboard directly on your system without using Docker.

## System Requirements

- Node.js 20 or later
- MongoDB 7.0 or later
- Git
- 1GB+ free disk space
- Linux system with systemd (for service management)

## Installation Steps

### 1. Install Prerequisites

1. Install Node.js 20:
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 20
   nvm use 20
   ```

2. Install MongoDB:
   ```bash
   # For Ubuntu/Debian
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt update
   sudo apt install -y mongodb-org

   # Start MongoDB service
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

### 2. Clone and Set Up the Repository

1. Clone the repository:
   ```bash
   git clone https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git
   cd docker-trunk-recorder-dashboard
   ```

2. Create required directories:
   ```bash
   mkdir -p data/mongodb data/talkgroups
   chmod -R 755 data/
   ```

3. Create system alias file:
   ```bash
   echo "shortName,alias" > data/system-alias.csv
   ```

### 3. Configure MongoDB

1. Start MongoDB replica set (required for change streams):
   ```bash
   # Stop MongoDB service
   sudo systemctl stop mongod

   # Edit MongoDB configuration
   sudo nano /etc/mongod.conf

   # Add/modify these lines:
   replication:
     replSetName: "rs0"
   ```

2. Start MongoDB and initialize replica set:
   ```bash
   sudo systemctl start mongod

   # Initialize replica set
   mongosh --eval '
   rs.initiate({
     _id: "rs0",
     members: [{ _id: 0, host: "localhost:27017" }]
   });
   '
   ```

3. Initialize database and collections:
   ```bash
   mongosh --eval '
   db = db.getSiblingDB("trunk_recorder");
   db.createCollection("radio_events");
   db.radio_events.createIndex({ timestamp: -1 });
   db.radio_events.createIndex({ "talkgroup.id": 1 });
   '
   ```

### 4. Configure the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Edit .env file:
   ```bash
   # Required Settings
   DASHBOARD_PORT=3000
   MONGODB_URI=mongodb://localhost:27017/?replicaSet=rs0&directConnection=true
   DB_NAME=trunk_recorder
   COLLECTION_NAME=radio_events
   SYSTEM_FILTERS=hamco|Hamilton P25,warco|Warren P25

   # Optional Settings
   RADIOS_FILE=/path/to/radios.csv
   ```

### 5. Set Up System Services

1. Create dashboard service:
   ```bash
   sudo nano /etc/systemd/system/trdash-dashboard.service

   [Unit]
   Description=Trunk Recorder Dashboard
   After=network.target mongod.service

   [Service]
   Type=simple
   User=YOUR_USERNAME
   WorkingDirectory=/path/to/docker-trunk-recorder-dashboard
   Environment=NODE_ENV=production
   ExecStart=/usr/local/bin/node src/server.js
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

2. Create ingest service:
   ```bash
   sudo nano /etc/systemd/system/trdash-ingest.service

   [Unit]
   Description=Trunk Recorder Dashboard Ingest Service
   After=network.target mongod.service

   [Service]
   Type=simple
   User=YOUR_USERNAME
   WorkingDirectory=/path/to/docker-trunk-recorder-dashboard
   Environment=NODE_ENV=production
   Environment=HTTP_MONGO_PORT=3001
   ExecStart=/usr/local/bin/node http-mongo-service.js
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. Start and enable services:
   ```bash
   # Reload systemd
   sudo systemctl daemon-reload

   # Start services
   sudo systemctl start trdash-dashboard
   sudo systemctl start trdash-ingest

   # Enable services to start on boot
   sudo systemctl enable trdash-dashboard
   sudo systemctl enable trdash-ingest
   ```

### 6. Configure Trunk Recorder

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

### 7. Talkgroup Configuration

Choose one of these options:

1. Auto-Discovery (Default):
   - Start using the dashboard
   - System will automatically track new talkgroups
   - Talkgroups are saved to data/talkgroups/talkgroups.csv

2. Radio Reference Import:
   - Download talkgroup data from Radio Reference (CSV format)
   - Place in data/talkgroups/ as talkgroups.csv
   - For multiple systems: use shortname-talkgroups.csv naming format

### 8. Verify Installation

1. Check service status:
   ```bash
   sudo systemctl status trdash-dashboard
   sudo systemctl status trdash-ingest
   sudo systemctl status mongod
   ```

2. Check logs:
   ```bash
   sudo journalctl -u trdash-dashboard
   sudo journalctl -u trdash-ingest
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
   # Check MongoDB status
   sudo systemctl status mongod

   # Check MongoDB logs
   sudo tail -f /var/log/mongodb/mongod.log

   # Verify replica set status
   mongosh --eval "rs.status()"
   ```

2. Permission Issues:
   ```bash
   # Fix data directory permissions
   sudo chown -R $USER:$USER data/
   chmod -R 755 data/

   # Check service user permissions
   sudo ls -l /path/to/docker-trunk-recorder-dashboard
   ```

3. Service Issues:
   ```bash
   # View detailed service logs
   sudo journalctl -u trdash-dashboard -f
   sudo journalctl -u trdash-ingest -f
   ```

### Development Mode

For development work:

1. Stop the services:
   ```bash
   sudo systemctl stop trdash-dashboard
   sudo systemctl stop trdash-ingest
   ```

2. Run in development mode:
   ```bash
   # Terminal 1 - Dashboard
   npm run dev

   # Terminal 2 - Ingest Service
   node http-mongo-service.js
   ```

### Maintenance

1. Update application:
   ```bash
   git pull
   npm install
   sudo systemctl restart trdash-dashboard
   sudo systemctl restart trdash-ingest
   ```

2. Backup data:
   ```bash
   # Stop services
   sudo systemctl stop trdash-dashboard
   sudo systemctl stop trdash-ingest

   # Backup data
   tar -czf backup.tar.gz data/

   # Restart services
   sudo systemctl start trdash-dashboard
   sudo systemctl start trdash-ingest
   ```

3. MongoDB maintenance:
   ```bash
   # Backup database
   mongodump --db trunk_recorder --out backup/

   # Restore database
   mongorestore --db trunk_recorder backup/trunk_recorder/
