#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f "$(dirname "$0")/.env" ]; then
  export $(cat "$(dirname "$0")/.env" | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
fi

# Configuration with defaults
HTTP_HOST="${HTTP_MONGO_HOST:-localhost}"
HTTP_PORT="${HTTP_MONGO_PORT:-3001}"
DEBUG="${DEBUG:-false}"

# Verify ingest service is accessible
if [ "$DEBUG" = true ]; then
  echo "Checking connection to http://${HTTP_HOST}:${HTTP_PORT}/health" >> ./script_debug.log
fi

if ! curl -s "http://${HTTP_HOST}:${HTTP_PORT}/health" > /dev/null; then
    echo "Error: Cannot connect to ingest service at http://${HTTP_HOST}:${HTTP_PORT}"
    echo "Please ensure:"
    echo "1. The Docker containers are running on the dashboard machine"
    echo "2. The dashboard machine IP is correct in .env"
    echo "3. Port 3001 is accessible"
    exit 1
fi

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug)
      DEBUG=true
      shift
      ;;
    *)
      break
      ;;
  esac
done

# Validate input arguments
if [ $# -lt 3 ]; then
  echo "Usage: $0 [--debug] <shortName> <radioID> <eventType> [talkgroup|source] [patchedTalkgroups]"
  exit 1
fi

# Assign arguments to variables
SHORT_NAME="$1"
RADIO_ID="$2"
EVENT_TYPE="$3"
TALKGROUP_OR_SOURCE="$4"
PATCHED_TALKGROUPS="$5"

# Debugging: Log parsed arguments
if [ "$DEBUG" = true ]; then
  echo "Short Name: $SHORT_NAME, Radio ID: $RADIO_ID, Event Type: $EVENT_TYPE, Talkgroup/Source: $TALKGROUP_OR_SOURCE, Patched Talkgroups: $PATCHED_TALKGROUPS" >> ./script_debug.log
fi

# Create JSON payload
JSON_DOC=$(jq -n \
  --arg shortName "$SHORT_NAME" \
  --arg radioID "$RADIO_ID" \
  --arg eventType "$EVENT_TYPE" \
  --arg talkgroupOrSource "$TALKGROUP_OR_SOURCE" \
  --arg patchedTalkgroups "$PATCHED_TALKGROUPS" \
  '{
    shortName: $shortName,
    radioID: $radioID,
    eventType: $eventType,
    talkgroupOrSource: $talkgroupOrSource,
    patchedTalkgroups: $patchedTalkgroups
  }')

# Debugging: Log JSON payload
if [ "$DEBUG" = true ]; then
  echo "JSON Payload: $JSON_DOC" >> ./script_debug.log
fi

# Send HTTP request using curl
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$JSON_DOC" \
  "http://${HTTP_HOST}:${HTTP_PORT}/event")

# Check if curl command was successful
if [ $? -eq 0 ]; then
  if [ "$DEBUG" = true ]; then
    echo "Response: $RESPONSE" >> ./script_debug.log
  fi
  
  # Check response status
  if echo "$RESPONSE" | jq -e '.status == "success"' > /dev/null; then
    if [ "$DEBUG" = true ]; then
      echo "Event logged successfully." >> ./script_debug.log
    fi
    exit 0
  else
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // "Unknown error"')
    if [ "$DEBUG" = true ]; then
      echo "Error: $ERROR_MSG" >> ./script_debug.log
    fi
    exit 1
  fi
else
  if [ "$DEBUG" = true ]; then
    echo "Error: Failed to connect to HTTP service" >> ./script_debug.log
  fi
  exit 1
fi
