#!/bin/bash

# =============================================================================
# Configuration Variables
# =============================================================================
# To customize these settings, either:
# 1. Set them as environment variables before running trunk-recorder:
#    export HTTP_HOST="192.168.1.100"
#    export HTTP_PORT="3001"
#    ./trunk-recorder
#
# 2. Or modify the default values below:
#    HTTP_HOST="192.168.1.100"  # Remove the # at the start of the line
#
# Available Settings:
# HTTP_HOST      - Dashboard server address (default: localhost)
# HTTP_PORT      - Dashboard server port (default: 3001)
# DEBUG          - Enable debug logging (default: false)
# CONN_TIMEOUT   - Connection timeout in seconds (default: 1)
# PROCESS_EVENTS - Comma-separated list of event types to process (default: join,call)
#                 Available types: on, join, off, ackresp, call, data, ans_req, location
#
# Examples:
#HTTP_HOST="192.168.1.100"     # Use specific IP address
#HTTP_PORT="8080"              # Use alternate port
#DEBUG="true"                  # Enable debug logging
#CONN_TIMEOUT="2"             # Increase timeout to 2 seconds
#PROCESS_EVENTS="join,call,location"  # Process additional event types
# =============================================================================

# Configuration
HTTP_HOST="${HTTP_HOST:-localhost}"
HTTP_PORT="${HTTP_PORT:-3001}"
DEBUG="${DEBUG:-false}"
CONN_TIMEOUT="${CONN_TIMEOUT:-1}"
PROCESS_EVENTS="${PROCESS_EVENTS:-join,call}"

# Convert PROCESS_EVENTS to array for faster lookup
IFS=',' read -ra ALLOWED_EVENTS <<< "$PROCESS_EVENTS"
declare -A EVENT_MAP
for event in "${ALLOWED_EVENTS[@]}"; do
    EVENT_MAP[${event// /}]=1
done

log_debug() {
    if [ "$DEBUG" = true ]; then
        echo "$1" >&2
    fi
}

create_json() {
    local shortName="${1//\\/\\\\}"
    shortName="${shortName//\"/\\\"}"
    shortName="${shortName//$'\n'/\\n}"
    local radioID="${2//\\/\\\\}"
    radioID="${radioID//\"/\\\"}"
    radioID="${radioID//$'\n'/\\n}"
    local eventType="${3//\\/\\\\}"
    eventType="${eventType//\"/\\\"}"
    eventType="${eventType//$'\n'/\\n}"
    local talkgroupOrSource="${4//\\/\\\\}"
    talkgroupOrSource="${talkgroupOrSource//\"/\\\"}"
    talkgroupOrSource="${talkgroupOrSource//$'\n'/\\n}"
    local patchedTalkgroups="${5//\\/\\\\}"
    patchedTalkgroups="${patchedTalkgroups//\"/\\\"}"
    patchedTalkgroups="${patchedTalkgroups//$'\n'/\\n}"

    echo -n "{\"shortName\":\"$shortName\",\"radioID\":\"$radioID\",\"eventType\":\"$eventType\",\"talkgroupOrSource\":\"$talkgroupOrSource\",\"patchedTalkgroups\":\"$patchedTalkgroups\"}"
}

http_post() {
    local host="$1"
    local port="$2"
    local path="$3"
    local payload="$4"
    local response=""
    local ret=0

    # Ensure FD 4 is closed before we start
    exec 4>&- 2>/dev/null || true

    # Set up cleanup trap
    trap 'exec 4>&- 2>/dev/null || true' EXIT INT TERM

    # Attempt connection
    if ! exec 4<>/dev/tcp/$host/$port; then
        log_debug "Failed to connect to $host:$port"
        exec 4>&- 2>/dev/null || true
        trap - EXIT INT TERM
        return 1
    fi

    # Send request
    if ! echo -en "POST $path HTTP/1.1\r\nHost: $host:$port\r\nContent-Type: application/json\r\nContent-Length: ${#payload}\r\nConnection: close\r\n\r\n$payload" >&4; then
        log_debug "Failed to send request to $host:$port"
        exec 4>&- 2>/dev/null || true
        trap - EXIT INT TERM
        return 1
    fi

    # Read response with timeout
    local IFS='' line
    local SECONDS=0
    while (( SECONDS < CONN_TIMEOUT )) && read -r -t 1 line <&4; do
        response+="$line"$'\n'
    done

    # Clean up
    exec 4>&- 2>/dev/null || true
    trap - EXIT INT TERM

    # Parse and return response body
    if [ -n "$response" ]; then
        body=$(echo "$response" | sed '1,/^$/d')
        [ "$DEBUG" = true ] && log_debug "Raw response: $response"
        [ "$DEBUG" = true ] && log_debug "Parsed body: $body"
        echo "$body"
        return 0
    else
        [ "$DEBUG" = true ] && log_debug "Empty response received"
        # Return empty success response since server accepted the request
        echo '{"status":"success"}'
        return 0
    fi
}

# Argument validation
[[ $# -lt 3 ]] && exit 1
[[ -z "$1" || -z "$2" || -z "$3" ]] && exit 1
[[ "$2" =~ ^[0-9]+$ ]] || exit 1

# Log initial call
[ "$DEBUG" = true ] && log_debug "Script called with: shortName='$1' radioID='$2' eventType='$3' talkgroupOrSource='$4' patchedTalkgroups='$5'"

# Check if event type should be processed
if [ "${EVENT_MAP[$3]}" = "1" ]; then
    [ "$DEBUG" = true ] && log_debug "Processing '$3' event"
else
    [ "$DEBUG" = true ] && log_debug "Skipping '$3' event (not in PROCESS_EVENTS: $PROCESS_EVENTS)"
    exit 0
fi

# Quick connection check
[ "$DEBUG" = true ] && log_debug "Checking connection to ${HTTP_HOST}:${HTTP_PORT}"
if ! timeout $CONN_TIMEOUT bash -c '
    exec 3>&- 2>/dev/null || true
    if ! exec 3<>/dev/tcp/$0/$1; then
        exit 1
    fi
    exec 3>&-
' "${HTTP_HOST}" "${HTTP_PORT}" 2>/dev/null; then
    log_debug "Connection check failed"
    exit 1
fi
[ "$DEBUG" = true ] && log_debug "Connection check successful"

# Send event
JSON_DOC=$(create_json "$1" "$2" "$3" "$4" "$5")
[ "$DEBUG" = true ] && log_debug "Sending request to ${HTTP_HOST}:${HTTP_PORT}/event"
[ "$DEBUG" = true ] && log_debug "Payload: $JSON_DOC"

RESPONSE=$(http_post "$HTTP_HOST" "$HTTP_PORT" "/event" "$JSON_DOC") || exit 1
[ "$DEBUG" = true ] && log_debug "Response received: $RESPONSE"

# Consider empty response as success since server accepted the request
[ "$DEBUG" = true ] && log_debug "Request successful - server accepted the request"

exit 0
