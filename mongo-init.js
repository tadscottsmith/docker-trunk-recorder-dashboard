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

// Define collection schema
const validator = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["type", "timestamp"],
      properties: {
        type: { bsonType: "string" },
        timestamp: { bsonType: "date" }
      }
    }
  }
};

// Create or update collection schema
try {
  db.createCollection("radio_events", validator);
  print("Created radio_events collection with schema validation");
} catch (e) {
  if (e.codeName === "NamespaceExists") {
    db.runCommand({
      collMod: "radio_events",
      validator: validator.validator
    });
    print("Updated radio_events collection schema");
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
