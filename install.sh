#!/bin/bash

# One-click installer for Trunk Recorder Dashboard
# Version: 1.1
# Author: Cline

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling function
handle_error() {
    local exit_code=$?
    local line_number=$1
    echo -e "${RED}Error occurred in script at line ${line_number}${NC}"
    
    case ${exit_code} in
        1)
            echo -e "${RED}General error occurred${NC}"
            ;;
        126)
            echo -e "${RED}Command invoked cannot execute (permission problem or not executable)${NC}"
            ;;
        127)
            echo -e "${RED}Command not found${NC}"
            ;;
        *)
            echo -e "${RED}Unknown error occurred (exit code: ${exit_code})${NC}"
            ;;
    esac
    
    echo -e "${YELLOW}Generating error report...${NC}"
    gather_logs
    exit ${exit_code}
}

# Set up error handling
trap 'handle_error ${LINENO}' ERR

# Check system requirements
check_requirements() {
    local errors=0
    
    # Check if running in LXC container
    if [ -f /proc/1/environ ] && grep -q "container=lxc" /proc/1/environ; then
        echo -e "${YELLOW}Running in LXC container, skipping root user check${NC}"
    elif [ "$EUID" -eq 0 ]; then
        echo -e "${RED}Please do not run this script as root/sudo${NC}"
        errors=$((errors + 1))
    fi
    
    # Check for required commands
    for cmd in docker docker-compose curl git; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}${cmd} could not be found. Please install ${cmd} first.${NC}"
            errors=$((errors + 1))
        fi
    done
    
    # Check Docker service
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker service is not running${NC}"
        echo -e "${YELLOW}Try: sudo systemctl start docker${NC}"
        errors=$((errors + 1))
    fi
    
    # Check network connectivity
    if ! curl -s --connect-timeout 5 https://github.com &> /dev/null; then
        echo -e "${RED}No internet connection or GitHub is unreachable${NC}"
        errors=$((errors + 1))
    fi
    
    # Check disk space (need at least 1GB free)
    local free_space=$(df -P . | awk 'NR==2 {print $4}')
    if [ "$free_space" -lt 1048576 ]; then
        echo -e "${RED}Insufficient disk space. Need at least 1GB free.${NC}"
        errors=$((errors + 1))
    fi
    
    # Check if target directory already exists
    if [ -d "tr-dashboard" ]; then
        echo -e "${RED}Directory 'tr-dashboard' already exists${NC}"
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ]; then
        echo -e "${RED}Found ${errors} error(s). Please fix them and try again.${NC}"
        exit 1
    fi
}

# Verify successful command execution
verify_command() {
    local cmd_output=$1
    local error_msg=$2
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}${error_msg}${NC}"
        echo -e "${YELLOW}Command output:${NC}"
        echo "$cmd_output"
        exit 1
    fi
}

# Initialize installation
echo -e "${GREEN}Starting Trunk Recorder Dashboard installation...${NC}"
echo -e "${YELLOW}Checking system requirements...${NC}"
check_requirements

# Step 1: Clone repository
echo -e "${YELLOW}[1/5] Cloning repository...${NC}"
echo -e "${YELLOW}→ From: https://github.com/LumenPrima/docker-trunk-recorder-dashboard${NC}"
git clone -b feature/install-improvements https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git tr-dashboard
cd tr-dashboard || exit 1
echo -e "${GREEN}✓ Repository cloned successfully${NC}"

# Function to gather logs and create bug report
gather_logs() {
    echo -e "${YELLOW}Gathering logs for bug report...${NC}"
    
    # Create temp directory for logs
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local log_dir="bug_report_${timestamp}"
    mkdir -p "${log_dir}"
    
    # Collect Docker logs
    echo -e "${YELLOW}Collecting Docker logs...${NC}"
    docker-compose logs > "${log_dir}/docker_compose.log" 2>&1
    docker ps -a > "${log_dir}/docker_containers.log" 2>&1
    docker images > "${log_dir}/docker_images.log" 2>&1
    
    # Collect system information
    echo -e "${YELLOW}Collecting system information...${NC}"
    uname -a > "${log_dir}/system_info.log" 2>&1
    docker version > "${log_dir}/docker_version.log" 2>&1
    docker-compose version > "${log_dir}/docker_compose_version.log" 2>&1
    
    # Collect application logs
    echo -e "${YELLOW}Collecting application logs...${NC}"
    if [ -d "data/mongodb/diagnostic.data" ]; then
        cp -r data/mongodb/diagnostic.data "${log_dir}/mongodb_diagnostic_data"
    fi
    
    # Create environment info (removing sensitive data)
    if [ -f ".env" ]; then
        grep -v "PASSWORD\|KEY\|SECRET\|TOKEN" .env > "${log_dir}/env_sanitized.log"
    fi
    
    # Package everything into a tar archive
    echo -e "${YELLOW}Creating bug report archive...${NC}"
    tar -czf "tr_dashboard_bug_report_${timestamp}.tar.gz" "${log_dir}" 2>/dev/null
    rm -rf "${log_dir}"
    
    echo -e "${GREEN}Bug report created: tr_dashboard_bug_report_${timestamp}.tar.gz${NC}"
    echo -e "Please attach this file when reporting issues on GitHub"
}


# Step 2: Setup environment
echo -e "${YELLOW}[2/5] Setting up environment...${NC}"
if [ ! -f ".env.example" ]; then
    echo -e "${RED}Missing .env.example file${NC}"
    exit 1
fi

cp .env.example .env
verify_command "$?" "Failed to create .env file"

mkdir -p data/mongodb data/talkgroups
verify_command "$?" "Failed to create data directories"

# Verify write permissions
if ! touch data/mongodb/.write_test 2>/dev/null; then
    echo -e "${RED}No write permission in data/mongodb directory${NC}"
    exit 1
fi
rm data/mongodb/.write_test

# Step 3: Build Docker images
echo -e "${YELLOW}[3/5] Building Docker images...${NC}"
echo -e "${YELLOW}→ Building dashboard image${NC}"
docker-compose build dashboard
echo -e "${YELLOW}→ Building ingest service image${NC}"
docker-compose build ingest
echo -e "${GREEN}✓ Docker images built successfully${NC}"

# Step 4: Start services
echo -e "${YELLOW}[4/5] Starting services...${NC}"
echo -e "${YELLOW}→ Starting MongoDB${NC}"
docker-compose up -d mongodb
sleep 5

echo -e "${YELLOW}→ Starting mongo-init${NC}"
docker-compose up mongo-init
echo -e "${YELLOW}→ Waiting for MongoDB initialization...${NC}"
sleep 5

echo -e "${YELLOW}→ Starting dashboard and ingest services${NC}"
docker-compose up -d dashboard ingest
echo -e "${GREEN}✓ Services started${NC}"

# Step 5: Verify installation
echo -e "${YELLOW}[5/5] Verifying installation...${NC}"
echo -e "${YELLOW}→ Checking container status...${NC}"

# Wait for services to be ready (timeout after 30 seconds)
timeout=30
while [ $timeout -gt 0 ]; do
    if curl -s http://localhost:3000 >/dev/null; then
        echo -e "${GREEN}Services are ready!${NC}"
        break
    fi
    sleep 1
    timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
    echo -e "${RED}✗ Services failed to start within 30 seconds${NC}"
    echo -e "${YELLOW}→ Collecting logs for troubleshooting...${NC}"
    gather_logs
    echo -e "${RED}Please check the logs above for errors${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Services are responding${NC}"

# Verify all required containers are running
echo -e "${YELLOW}→ Verifying container health...${NC}"
required_containers=("mongodb" "dashboard" "ingest")
for container in "${required_containers[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -q "$container"; then
        echo -e "${RED}✗ Container '$container' is not running${NC}"
        echo -e "${YELLOW}→ Collecting logs for troubleshooting...${NC}"
        gather_logs
        echo -e "${RED}Please check the logs above for errors${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Container '$container' is running${NC}"
done

echo -e "${GREEN}Installation complete!${NC}"
echo -e "Access the dashboard at: http://localhost:3000"

echo -e "\nUseful commands:"
echo -e "  Stop dashboard:  cd tr-dashboard && docker-compose down"
echo -e "  Update:         cd tr-dashboard && git pull && docker-compose up -d --build"
echo -e "  Create logs:    cd tr-dashboard && ./install.sh --logs"

# Check for --logs argument
if [ "$1" == "--logs" ]; then
    gather_logs
    exit 0
fi
