#!/bin/bash

set -e

echo "========================================"
echo "Docker Installation Script"
echo "========================================"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected OS: $OS $VER"

# Install Docker based on OS
case $OS in
    ubuntu|debian)
        echo "Installing Docker on Ubuntu/Debian..."
        
        # Update package index
        sudo apt-get update
        
        # Install prerequisites
        sudo apt-get install -y \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # Set up the stable repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker Engine
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        ;;
        
    centos|rhel|fedora)
        echo "Installing Docker on CentOS/RHEL/Fedora..."
        
        # Remove old versions
        sudo yum remove -y docker \
                          docker-client \
                          docker-client-latest \
                          docker-common \
                          docker-latest \
                          docker-latest-logrotate \
                          docker-logrotate \
                          docker-engine
        
        # Install prerequisites
        sudo yum install -y yum-utils
        
        # Set up the repository
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        
        # Install Docker Engine
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        
        # Start Docker
        sudo systemctl start docker
        ;;
        
    *)
        echo "Unsupported OS: $OS"
        echo "Please install Docker manually"
        exit 1
        ;;
esac

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group (optional)
if [ -n "$SUDO_USER" ]; then
    sudo usermod -aG docker $SUDO_USER
    echo "Added $SUDO_USER to docker group"
elif [ -n "$USER" ]; then
    sudo usermod -aG docker $USER
    echo "Added $USER to docker group"
fi

# Verify installation
echo ""
echo "Verifying Docker installation..."
sudo docker --version
sudo docker compose version

echo ""
echo "========================================"
echo "Docker installed successfully!"
echo "========================================"
echo ""
echo "Note: You may need to log out and back in for group changes to take effect."