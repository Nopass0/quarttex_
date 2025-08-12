#!/bin/bash

echo "========================================"
echo "Server SSH Diagnostic Script"
echo "========================================"
echo ""

echo "1. SSH Service Status:"
sudo systemctl status sshd | head -15
echo ""

echo "2. SSH Port Configuration:"
sudo grep -E "^Port|^PermitRootLogin|^PasswordAuthentication|^PubkeyAuthentication" /etc/ssh/sshd_config
echo ""

echo "3. Active SSH Listening Ports:"
sudo ss -tlnp | grep ssh
echo ""

echo "4. Firewall Status:"
sudo ufw status verbose 2>/dev/null || echo "UFW not installed"
echo ""

echo "5. Recent SSH Connection Attempts (last 20 lines):"
sudo tail -20 /var/log/auth.log | grep -E "sshd|Failed|Accepted"
echo ""

echo "6. Fail2ban Status (if installed):"
sudo fail2ban-client status sshd 2>/dev/null || echo "Fail2ban not installed or sshd jail not configured"
echo ""

echo "7. Current Blocked IPs (iptables):"
sudo iptables -L -n | grep -E "DROP|REJECT" | head -10
echo ""

echo "========================================"
echo "To allow GitHub Actions IPs, you can:"
echo "1. Temporarily allow all: sudo ufw allow 22/tcp"
echo "2. Check blocked IPs: sudo fail2ban-client status sshd"
echo "3. Unban specific IP: sudo fail2ban-client unban <IP>"
echo "========================================"