print("Starting MongoDB initialization...");

// Function to check if replica set is already initialized
function isReplicaSetInitialized() {
    try {
        const status = rs.status();
        return status.ok === 1;
    } catch (e) {
        if (e.codeName === "NotYetInitialized") {
            return false;
        }
        throw e;
    }
}

// Function to wait for primary
function waitForPrimary() {
    print("Waiting for primary...");
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
        try {
            const status = rs.status();
            if (status.ok === 1 && status.members) {
                const primary = status.members.find(m => m.state === 1);
                if (primary) {
                    print("Primary is ready");
                    return true;
                }
            }
        } catch (e) {
            print("Error checking primary status: " + e);
        }
        
        sleep(1000);
        attempts++;
    }
    
    throw new Error("Timeout waiting for primary");
}

// Initialize replica set if needed
if (!isReplicaSetInitialized()) {
    print("Initializing replica set...");
    const config = {
        _id: "rs0",
        members: [
            { 
                _id: 0, 
                host: "mongodb:27017", 
                priority: 1,
                votes: 1,
                arbiterOnly: false,
                buildIndexes: true,
                hidden: false,
                slaveDelay: 0
            }
        ],
        settings: {
            chainingAllowed: true,
            heartbeatIntervalMillis: 2000,
            heartbeatTimeoutSecs: 10,
            electionTimeoutMillis: 10000,
            catchUpTimeoutMillis: -1
        }
    };
    
    const initResult = rs.initiate(config);
    if (initResult.ok !== 1) {
        throw new Error("Failed to initialize replica set: " + tojson(initResult));
    }
    print("Replica set initialized");
}

// Wait for replica set to be ready with longer timeout
let attempts = 0;
const maxAttempts = 60; // 60 seconds total
while (attempts < maxAttempts) {
    try {
        const status = rs.status();
        if (status.ok === 1 && status.members) {
            const primary = status.members.find(m => m.state === 1);
            if (primary) {
                print("Primary is ready");
                break;
            }
        }
    } catch (e) {
        print("Waiting for replica set: " + e);
    }
    sleep(1000);
    attempts++;
}

if (attempts === maxAttempts) {
    throw new Error("Timeout waiting for replica set to be ready");
}

// Wait for replica set to be fully ready
sleep(5000); // Give more time for everything to settle

try {
    // Switch to trunk_recorder database
    print("Switching to trunk_recorder database...");
    db = db.getSiblingDB("trunk_recorder");

    // Create collection with write concern majority
    print("Creating radio_events collection...");
    try {
        db.createCollection("radio_events", {
            writeConcern: { w: "majority" }
        });
        print("Created radio_events collection");
    } catch (e) {
        if (e.codeName === "NamespaceExists") {
            print("Collection radio_events already exists");
        } else {
            throw e;
        }
    }

    // Create indexes with write concern majority
    print("Creating indexes...");
    db.radio_events.createIndex(
        { timestamp: -1 },
        { background: true, writeConcern: { w: "majority" } }
    );
    db.radio_events.createIndex(
        { "talkgroup.id": 1 },
        { background: true, writeConcern: { w: "majority" } }
    );
    print("Created indexes");

    // Configure server parameters
    print("Configuring server parameters...");
    db.adminCommand({
        setParameter: 1,
        diagnosticDataCollectionDirectorySizeMB: 100,
        diagnosticDataCollectionEnabled: false
    });
    
    print("MongoDB initialization completed successfully");
} catch (e) {
    print("Error during initialization: " + e);
    throw e;
}
