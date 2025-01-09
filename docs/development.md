# Development Guide

This guide covers development setup, project structure, and technical details for contributors.

## Project Structure

The project is organized into backend, frontend, and data modules:

### Data Structure
```
data/
├── mongodb/            # MongoDB database files
└── talkgroups/        # Talkgroup configuration files
    ├── talkgroups.csv     # Default talkgroups
    └── [system]-talkgroups.csv  # System-specific talkgroups
```

### Backend Structure
```
src/
├── server.js              # Core Express setup and initialization
├── services/             # Core business logic
│   ├── talkgroup-service.js  # Talkgroup file operations
│   ├── mongodb-service.js    # Database operations
│   └── websocket-service.js  # Real-time communication
├── routes/              # API endpoints
│   ├── talkgroup-routes.js   # Talkgroup management
│   ├── history-routes.js     # Historical data
│   └── config-routes.js      # System configuration
└── middleware/         # Express middleware
    ├── cors.js            # CORS handling
    └── error-handler.js   # Error handling
```

### Frontend Structure
```
public/
├── index.html           # Main HTML file
├── styles/
│   └── main.css        # Application styles
└── js/
    ├── app.js          # Application initialization
    ├── talkgroup-manager.js  # Talkgroup state management
    ├── ui-manager.js         # Core UI coordination
    └── components/          # UI components
        ├── filter-manager.js  # Filtering and sorting
        └── talkgroup-card.js  # Card display
```

## Development Setup

The project includes a development environment with hot reloading:

1. Clone the repository:
   ```bash
   git clone https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git
   cd docker-trunk-recorder-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create data directories:
   ```bash
   mkdir -p data/mongodb data/talkgroups
   ```

4. Start the development environment:
   ```bash
   docker compose up -d
   ```

The development setup includes:
- Hot reloading for both frontend and backend changes
- Source maps for better debugging
- Nodemon for automatic server restart
- Volume mounts for real-time code updates

## Development Scripts

- `npm start`: Run in production mode
- `npm run dev`: Run with hot reloading (backend only)
- `npm run watch`: Run with hot reloading (frontend and backend)

## Docker Configuration

The development environment uses Docker Compose with the following features:

### Volume Mounts
- `./src:/app/src`: Backend source code
- `./public:/app/public`: Frontend assets
- `./data:/app/data`: Persistent data
- `./package.json:/app/package.json`: Package configuration

### Environment Variables
- `NODE_ENV=development`: Enables development features
- `MONGODB_URI`: Database connection string
- `DB_NAME`: Database name
- `COLLECTION_NAME`: Collection name
- `DASHBOARD_PORT`: External port for the dashboard (default: 3000)
- `SYSTEM_FILTERS`: System filter configuration (format: "shortname|Display Name,...")
- `RADIOS_FILE`: Path to external radios.csv file (optional)

## Data Storage

### MongoDB Data
- Location: `data/mongodb/`
- Contains all MongoDB database files
- Persists across container restarts
- Automatically created on first run

### Talkgroup Files
- Location: `data/talkgroups/`
- Contains all talkgroup configuration files
- Supports multiple system-specific files
- Hot-reloading enabled for file changes
- Compatible with trunk-recorder CSV format
- Headers: Decimal,Hex,Alpha Tag,Mode,Description,Tag,Category
- Default Mode: 'D' for digital

### System Aliases
- Location: `data/system-alias.csv`
- Maps system shortnames to display names
- Auto-generated for new systems
- Hot-reloading enabled for changes

## Code Organization

### Backend Services

#### TalkgroupService
- Manages talkgroup file operations
- Handles file watching and reloading
- Maintains talkgroup metadata
- Manages system aliases

#### MongoDBService
- Manages database connections
- Handles change streams
- Provides data access methods
- Attaches system metadata

#### WebSocketService
- Manages Socket.IO connections
- Handles real-time event broadcasting
- Provides client communication
- Emits system updates

### Frontend Components

#### FilterManager
- Handles filtering and sorting logic
- Manages filter state
- Updates UI based on filter changes
- Handles system filtering

#### TalkgroupCard
- Creates talkgroup display cards
- Handles card interactions
- Manages history modal
- Displays system information

#### UIManager
- Coordinates UI components
- Manages global UI state
- Handles component communication
- Updates system filters

## API Endpoints

### Talkgroup Routes
- `GET /api/talkgroups`: Get all talkgroup metadata
- `POST /api/talkgroups/reload`: Reload talkgroup files
- `POST /api/talkgroups/:decimal`: Update talkgroup metadata
- `GET /api/talkgroup/:id/history`: Get talkgroup history

### History Routes
- `GET /api/history/:duration`: Get historical events

### Config Routes
- `GET /api/version`: Get application version
- `GET /api/config`: Get application configuration

## Contributing

1. Fork the repository from [GitHub](https://github.com/LumenPrima/docker-trunk-recorder-dashboard)
2. Create a feature branch
3. Make your changes
4. Run tests (when implemented)
5. Submit a pull request

### Development Guidelines
- Follow existing code style and formatting
- Add comments for complex logic
- Update documentation for new features
- Test changes with both new and existing data
- Consider backward compatibility
- Handle error cases appropriately

### Version Control
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Update version in package.json
- Add version history to README.md
- Keep development notes in docs/development.md
- Use descriptive commit messages

## Troubleshooting Development

### Database Issues
- Check if MongoDB data directory exists: `data/mongodb/`
- Verify directory permissions
- Check MongoDB logs: `docker compose logs mongodb`

### Hot Reload Issues
- Verify nodemon is running
- Check file watch permissions
- Review Docker volume mounts

### Frontend Issues
- Check browser console for errors
- Verify WebSocket connection
- Review browser network requests
