#!/bin/bash

# One-click installer for Trunk Recorder Dashboard
# Version: 1.4
# Author: Cline
# Repository: https://github.com/LumenPrima/docker-trunk-recorder-dashboard

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
case "$1" in
    --logs)
        gather_logs
        exit 0
        ;;
    --update)
        check_for_update "$@"
        exit 0
        ;;
    --help)
        echo "Usage: $0 [OPTION]"
        echo "Options:"
        echo "  --logs    Generate bug report logs"
        echo "  --update  Check for and install updates"
        echo "  --help    Display this help message"
        exit 0
        ;;
esac

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
    
    # Check for existing files (skip if updating)
    if [ "$1" != "--update" ] && [ "$1" != "--installing" ]; then
        local git_files=(".git" ".gitignore" "package.json" "docker-compose.yml")
        for file in "${git_files[@]}"; do
            if [ -e "$file" ]; then
                echo -e "${RED}Found existing file/directory: $file${NC}"
                echo -e "${YELLOW}Please run this script in an empty directory${NC}"
                errors=$((errors + 1))
                break
            fi
        done
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

# Function to handle data directory
handle_data_directory() {
    # Create data directory if it doesn't exist
    if [ ! -d "data" ]; then
        echo -e "${YELLOW}Creating data directory...${NC}"
        mkdir -p data
    else
        echo -e "${YELLOW}Found existing data directory${NC}"
    fi

    # Create subdirectories if they don't exist
    for dir in "mongodb" "talkgroups"; do
        if [ ! -d "data/$dir" ]; then
            echo -e "${YELLOW}Creating data/$dir directory...${NC}"
            mkdir -p "data/$dir"
        else
            echo -e "${YELLOW}Found existing data/$dir directory${NC}"
        fi
    done

    # Create system alias file if it doesn't exist
    if [ ! -f "data/system-alias.csv" ]; then
        echo -e "${YELLOW}Creating system alias file...${NC}"
        echo "shortName,alias" > data/system-alias.csv
    else
        echo -e "${YELLOW}Found existing system alias file${NC}"
    fi

    # Set proper permissions
    echo -e "${YELLOW}Setting directory permissions...${NC}"
    chmod -R 777 data
    verify_command "$?" "Failed to set directory permissions"

    echo -e "${GREEN}✓ Data directory setup complete${NC}"
}

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

# Download and configure environment file
setup_environment() {
    if [ -f ".env" ]; then
        echo -e "${YELLOW}Found existing .env file${NC}"
        echo -e "${GREEN}Using existing configuration${NC}"
    else
        echo -e "${YELLOW}Downloading environment configuration file...${NC}"
        curl -O https://raw.githubusercontent.com/LumenPrima/docker-trunk-recorder-dashboard/bfa1423/.env.example
        verify_command "$?" "Failed to download .env.example"
        
        mv .env.example .env
        verify_command "$?" "Failed to rename .env.example to .env"
        
        echo -e "${GREEN}Created .env file${NC}"
    fi
    echo -e "${YELLOW}Please edit .env file now if needed. Common settings:${NC}"
    echo -e "  DASHBOARD_PORT: External port for the dashboard (default: 3000)"
    echo -e "  SYSTEM_FILTERS: Your system names and display names"
    echo -e "  RADIOS_FILE: Path to your radios.csv file (optional)"
    
    while true; do
        read -p "Would you like to edit the .env file before continuing? (y/n) " yn
        case $yn in
            [Yy]* )
                if command -v nano >/dev/null 2>&1; then
                    nano .env
                elif command -v vim >/dev/null 2>&1; then
                    vim .env
                else
                    echo -e "${YELLOW}No editor found. Please edit .env manually and press Enter to continue${NC}"
                    read
                fi
                break;;
            [Nn]* ) break;;
            * ) echo "Please answer yes or no.";;
        esac
    done
    
    echo -e "${GREEN}Environment configuration complete${NC}"
}

# Initialize installation
echo -e "${GREEN}Starting Trunk Recorder Dashboard installation...${NC}"
echo -e "${YELLOW}Checking system requirements...${NC}"
check_requirements "$1"

# Step 1: Setup environment
echo -e "${YELLOW}[1/6] Setting up environment...${NC}"
setup_environment

# Step 2: Clone repository
echo -e "${YELLOW}[2/6] Cloning repository...${NC}"
echo -e "${YELLOW}→ From: https://github.com/LumenPrima/docker-trunk-recorder-dashboard${NC}"

# Save .env if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Saving existing .env file...${NC}"
    mv .env .env.tmp
fi

# Clone repository
git clone -b feature/improved-filtering https://github.com/LumenPrima/docker-trunk-recorder-dashboard.git temp_clone
verify_command "$?" "Failed to clone repository"

# Move files from temp directory
echo -e "${YELLOW}Moving repository files...${NC}"
mv temp_clone/* temp_clone/.[!.]* . 2>/dev/null || true
rm -rf temp_clone

# Restore .env if it was saved
if [ -f ".env.tmp" ]; then
    echo -e "${YELLOW}Restoring .env file...${NC}"
    mv .env.tmp .env
fi

echo -e "${GREEN}✓ Repository cloned successfully${NC}"

# Step 3: Handle data directory
echo -e "${YELLOW}[3/6] Setting up data directory...${NC}"
handle_data_directory

# Step 4: Build Docker images
echo -e "${YELLOW}[4/6] Building Docker images...${NC}"
echo -e "${YELLOW}→ Building dashboard image${NC}"
docker-compose build dashboard
echo -e "${YELLOW}→ Building ingest service image${NC}"
docker-compose build ingest
echo -e "${GREEN}✓ Docker images built successfully${NC}"

# Step 5: Start services
echo -e "${YELLOW}[5/6] Starting services...${NC}"
echo -e "${YELLOW}→ Starting MongoDB${NC}"
docker-compose up -d mongodb
sleep 5

echo -e "${YELLOW}→ Initializing MongoDB${NC}"
# Run mongo-init and capture output
mongo_init_output=$(docker-compose --profile init up mongo-init 2>&1)
mongo_init_status=$?

# Check if it's an "already initialized" message or a real error
if [ $mongo_init_status -ne 0 ]; then
    if echo "$mongo_init_output" | grep -q "already initialized"; then
        echo -e "${YELLOW}MongoDB already initialized, continuing...${NC}"
    else
        echo -e "${RED}MongoDB initialization failed${NC}"
        echo -e "${YELLOW}→ Collecting logs for troubleshooting...${NC}"
        gather_logs
        exit 1
    fi
fi
echo -e "${GREEN}✓ MongoDB initialized${NC}"

echo -e "${YELLOW}→ Starting dashboard and ingest services${NC}"
docker-compose up -d dashboard ingest
echo -e "${GREEN}✓ Services started${NC}"

# Get dashboard port from .env
get_dashboard_port() {
    local port=3000
    if [ -f ".env" ]; then
        local env_port
        env_port=$(grep "^DASHBOARD_PORT=" .env | cut -d '=' -f2)
        if [ -n "$env_port" ]; then
            port=$env_port
        fi
    fi
    echo "$port"
}

# Step 6: Verify installation
echo -e "${YELLOW}[6/6] Verifying installation...${NC}"
echo -e "${YELLOW}→ Checking container status...${NC}"

# Get configured dashboard port
DASHBOARD_PORT=$(get_dashboard_port)

# Get the actual mapped port from Docker
get_mapped_port() {
    local container=$1
    local port=$2
    docker port "${container}" "${port}" 2>/dev/null | cut -d ':' -f2
}

# Wait for services to be ready (timeout after 30 seconds)
timeout=30
while [ $timeout -gt 0 ]; do
    # Get the actual mapped port for the dashboard container
    MAPPED_PORT=$(get_mapped_port "installscript_dashboard_1" "3000")
    if [ -n "$MAPPED_PORT" ]; then
        if curl -s "http://localhost:${MAPPED_PORT}" >/dev/null; then
            echo -e "${GREEN}Services are ready!${NC}"
            break
        fi
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
echo -e "Access the dashboard at: http://localhost:${DASHBOARD_PORT}"

echo -e "\nUseful commands:"
echo -e "  Stop dashboard:  docker-compose down"
echo -e "  Update:         git pull && docker-compose up -d --build"
echo -e "  Create logs:    ./install.sh --logs"
