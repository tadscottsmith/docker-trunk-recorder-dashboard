print("Initializing MongoDB...");

// Initialize replica set
config = {
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb:27017", priority: 1 }
  ]
};
rs.initiate(config);

// Wait for replica set to initialize
while (!rs.isMaster().ismaster) {
  sleep(1000);
}

// Switch to trunk_recorder database
db = db.getSiblingDB("trunk_recorder");

// Create collection without validation for maximum flexibility
try {
  db.createCollection("radio_events");
  print("Created radio_events collection");
} catch (e) {
  if (e.codeName === "NamespaceExists") {
    print("Collection radio_events already exists");
  } else {
    print("Error: " + e);
    throw e;
  }
}

// Create indexes
db.radio_events.createIndex({ timestamp: -1 });
db.radio_events.createIndex({ "talkgroup.id": 1 });
print("Created indexes");

// Disable diagnostic data collection
db.adminCommand({
  setParameter: 1,
  diagnosticDataCollectionDirectorySizeMB: 100,
  diagnosticDataCollectionEnabled: false
});
print("Configured diagnostic data collection");

print("MongoDB initialization complete.");
