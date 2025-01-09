#!/bin/bash

# Exit on any error
set -e

echo "Pulling latest changes..."
git pull

echo "Stopping dashboard service..."
docker-compose stop dashboard

echo "Removing dashboard container..."
docker-compose rm -f dashboard

echo "Rebuilding and starting dashboard service..."
docker-compose up -d --build dashboard

echo "Dashboard rebuild complete!"

# Check if service is running
if docker-compose ps | grep -q "dashboard.*Up"; then
    echo "Dashboard service is running"
else
    echo "Error: Dashboard service failed to start"
    echo "Check logs with: docker-compose logs dashboard"
    exit 1
fi
