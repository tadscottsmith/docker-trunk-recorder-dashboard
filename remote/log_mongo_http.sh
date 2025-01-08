#!/bin/bash

# Configuration
HTTP_HOST="${HTTP_HOST:-localhost}"
HTTP_PORT="${HTTP_PORT:-3001}"
DEBUG="${DEBUG:-false}"
CONN_TIMEOUT="${CONN_TIMEOUT:-1}"

# Debug logging with simple rotation
log_debug() {
    if [ "$DEBUG" = true ]; then
        echo "$1" >> ./script_debug.log
        # Rotate log if it exceeds 1MB
        if [ $(wc -c < ./script_debug.log) -gt 1048576 ]; then
            mv ./script_debug.log ./script_debug.log.old
        fi
    fi
}

# JSON creation with escaping
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

    cat << EOF
{
    "shortName": "$shortName",
    "radioID": "$radioID",
    "eventType": "$eventType",
    "talkgroupOrSource": "$talkgroupOrSource",
    "patchedTalkgroups": "$patchedTalkgroups"
}
EOF
}

# HTTP POST using /dev/tcp
http_post() {
    local host="$1"
    local port="$2"
    local path="$3"
    local payload="$4"

    if ! exec 4<>/dev/tcp/$host/$port; then
        log_debug "Failed to connect to $host:$port"
        return 1
    fi

    echo -en "POST $path HTTP/1.1\r\nHost: $host:$port\r\nContent-Type: application/json\r\nContent-Length: ${#payload}\r\nConnection: close\r\n\r\n$payload" >&4

    local response
    if ! response=$(timeout $CONN_TIMEOUT cat <&4); then
        log_debug "Timeout while reading response from $host:$port"
        exec 4>&-
        return 1
    fi

    exec 4>&-
    echo "$response" | sed '1,/^$/d'
}

# Extract status from JSON response
extract_status() {
    local response="$1"
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"')
    echo "$status"
}

# Argument parsing
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

# Validate arguments
if [ $# -lt 3 ]; then
    log_debug "Insufficient arguments"
    exit 1
fi

[[ -z "$1" || -z "$2" || -z "$3" ]] && exit 1
[[ "$2" =~ ^[0-9]+$ ]] || exit 1

# Quick connection check
if ! timeout $CONN_TIMEOUT bash -c "echo >/dev/tcp/${HTTP_HOST}/${HTTP_PORT}" 2>/dev/null; then
    log_debug "Connection check failed"
    exit 1
fi

# Assign variables
SHORT_NAME="$1"
RADIO_ID="$2"
EVENT_TYPE="$3"
TALKGROUP_OR_SOURCE="$4"
PATCHED_TALKGROUPS="$5"

# Create JSON and send request
JSON_DOC=$(create_json "$SHORT_NAME" "$RADIO_ID" "$EVENT_TYPE" "$TALKGROUP_OR_SOURCE" "$PATCHED_TALKGROUPS")
[ "$DEBUG" = true ] && log_debug "JSON Payload: $JSON_DOC"

RESPONSE=$(http_post "$HTTP_HOST" "$HTTP_PORT" "/event" "$JSON_DOC") || exit 1
[ "$DEBUG" = true ] && log_debug "Response: $RESPONSE"

# Validate response
STATUS=$(extract_status "$RESPONSE")
if [ "$STATUS" != "success" ]; then
    log_debug "Request failed with status: $STATUS"
    exit 1
fi

exit 0