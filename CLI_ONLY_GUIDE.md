# RadiusForge CLI-Only Configuration & Testing Guide

## 📖 Overview

This guide demonstrates how to configure, manage, and test RadiusForge entirely through the command line interface (CLI) without using the web GUI. Perfect for automation, scripting, headless servers, or users who prefer terminal-based workflows.

## 🚀 Quick Start CLI Commands

### Installation (Headless)

```bash
# Download and extract bundle
wget https://radiusforge.example.com/RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE.tar.gz
tar -xzf RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE.tar.gz
cd RADIUSFORGE-PRODUCTION-V1.4.0-COMPLETE

# Non-interactive installation
echo "1" | ./deploy.sh  # Choose traditional installation
# OR
echo "2" | ./deploy.sh  # Choose container deployment
```

### Service Management

```bash
# Traditional - Start services
sudo systemctl start radiusforge  # RHEL/CentOS
/opt/radiusforge/scripts/startup/radiusforge-macos.sh start  # macOS

# Container - Start services
docker start radiusforge

# Check service status
curl -s http://localhost:8917/health | jq .
```

## 🔧 Configuration via CLI

### 1. Environment Configuration

```bash
# Edit configuration file
sudo nano /opt/radiusforge/.env

# Or use sed for automated configuration
sudo sed -i 's/RADIUS_PRIMARY_HOST=.*/RADIUS_PRIMARY_HOST=10.0.0.100/' /opt/radiusforge/.env
sudo sed -i 's/RADIUS_PRIMARY_SECRET=.*/RADIUS_PRIMARY_SECRET=MySecureSecret123/' /opt/radiusforge/.env
sudo sed -i 's/RADIUS_SERVER_TYPE=.*/RADIUS_SERVER_TYPE=cisco-ise/' /opt/radiusforge/.env
```

### 2. Programmatic Configuration

```bash
# Create configuration script
cat > configure-radiusforge.sh << 'EOF'
#!/bin/bash

# RadiusForge CLI Configuration Script

CONFIG_FILE="/opt/radiusforge/.env"

# Function to update config
update_config() {
    local key=$1
    local value=$2
    sudo sed -i "s/^${key}=.*/${key}=${value}/" $CONFIG_FILE
}

# RADIUS Configuration
update_config "RADIUS_SERVER_TYPE" "${RADIUS_TYPE:-access-manager}"
update_config "RADIUS_PRIMARY_HOST" "${RADIUS_HOST:-192.168.1.10}"
update_config "RADIUS_PRIMARY_PORT" "${RADIUS_PORT:-1812}"
update_config "RADIUS_PRIMARY_SECRET" "${RADIUS_SECRET:-DefaultSecret}"
update_config "RADIUS_ACCOUNTING_PORT" "${ACCOUNTING_PORT:-1813}"

# Performance Settings
update_config "MAX_WORKERS" "${MAX_WORKERS:-8}"
update_config "MAX_CONNECTIONS" "${MAX_CONNECTIONS:-10000}"
update_config "TIMEOUT_SECONDS" "${TIMEOUT:-30}"

echo "Configuration updated successfully"
sudo systemctl restart radiusforge
EOF

chmod +x configure-radiusforge.sh

# Use the script with environment variables
RADIUS_HOST=10.0.0.50 RADIUS_SECRET=MySecret123 ./configure-radiusforge.sh
```

## 📡 API Testing via CLI

### 1. Basic API Health Check

```bash
# Check API status
curl -s http://localhost:8910/api/status | jq .

# Check version
curl -s http://localhost:8910/api/version | jq .

# Get current configuration
curl -s http://localhost:8910/api/config | jq .
```

### 2. Authentication Testing

```bash
# Test EAP-TLS authentication
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "EAP-TLS",
    "username": "testuser",
    "password": "TestPass123",
    "nas_ip": "10.0.0.1",
    "nas_port": 1,
    "calling_station_id": "00:11:22:33:44:55",
    "called_station_id": "AA:BB:CC:DD:EE:FF"
  }' | jq .

# Test MAB authentication
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "MAB",
    "mac_address": "00:11:22:33:44:55",
    "nas_ip": "10.0.0.1",
    "nas_port": 1
  }' | jq .

# Test 802.1X authentication
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "802.1X",
    "username": "john.doe",
    "password": "SecurePass456",
    "domain": "corporate.com",
    "nas_ip": "10.0.0.1"
  }' | jq .

# Test PEAP authentication
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "method": "PEAP",
    "username": "testuser@domain.com",
    "password": "Password123",
    "inner_method": "MSCHAPv2"
  }' | jq .
```

### 3. Batch Authentication Testing

```bash
# Create batch test script
cat > batch-auth-test.sh << 'EOF'
#!/bin/bash

# Batch Authentication Testing Script

API_URL="http://localhost:8910/api/test/auth"
RESULTS_FILE="auth-test-results.json"

# Test users array
declare -a USERS=(
    '{"method":"EAP-TLS","username":"user1","password":"pass1"}'
    '{"method":"MAB","mac_address":"00:11:22:33:44:55"}'
    '{"method":"802.1X","username":"user2","password":"pass2"}'
    '{"method":"PEAP","username":"user3","password":"pass3"}'
)

echo "Starting batch authentication tests..."
echo "[" > $RESULTS_FILE

for i in "${!USERS[@]}"; do
    echo "Testing user $((i+1))/${#USERS[@]}..."
    
    RESULT=$(curl -s -X POST $API_URL \
        -H "Content-Type: application/json" \
        -d "${USERS[$i]}")
    
    echo "$RESULT" >> $RESULTS_FILE
    
    if [ $i -lt $((${#USERS[@]} - 1)) ]; then
        echo "," >> $RESULTS_FILE
    fi
    
    # Parse result
    SUCCESS=$(echo $RESULT | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo "  ✓ Authentication successful"
    else
        echo "  ✗ Authentication failed"
    fi
done

echo "]" >> $RESULTS_FILE
echo "Results saved to $RESULTS_FILE"
EOF

chmod +x batch-auth-test.sh
./batch-auth-test.sh
```

## 🔄 Load Testing via CLI

### 1. Simple Load Test

```bash
# Run load test with 100 RPS for 60 seconds
curl -X POST http://localhost:8910/api/test/scale \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      {"rps": 100, "duration": 60}
    ],
    "auth_method": "MAB",
    "total_users": 1000
  }' | jq .
```

### 2. Progressive Load Test

```bash
# Create progressive load test
cat > load-test.json << EOF
{
  "name": "Progressive Load Test",
  "description": "Gradually increase load from 100 to 10000 RPS",
  "targets": [
    {"rps": 100, "duration": 60},
    {"rps": 500, "duration": 60},
    {"rps": 1000, "duration": 120},
    {"rps": 5000, "duration": 120},
    {"rps": 10000, "duration": 180}
  ],
  "auth_methods": ["EAP-TLS", "MAB", "802.1X", "PEAP"],
  "distribution": {
    "EAP-TLS": 25,
    "MAB": 25,
    "802.1X": 25,
    "PEAP": 25
  },
  "total_users": 50000,
  "nas_count": 100,
  "radius_server": "access-manager"
}
EOF

# Execute load test
curl -X POST http://localhost:8910/api/test/scale \
  -H "Content-Type: application/json" \
  -d @load-test.json > load-test-results.json

# Monitor progress
watch -n 1 'curl -s http://localhost:8910/api/test/status | jq .'
```

### 3. Continuous Load Testing

```bash
# Create continuous load test script
cat > continuous-load.sh << 'EOF'
#!/bin/bash

# Continuous Load Testing Script

API_URL="http://localhost:8910/api/test"
DURATION=3600  # 1 hour
RPS=1000
LOG_FILE="continuous-load.log"

echo "Starting continuous load test at $RPS RPS for $DURATION seconds..."

# Start load test
TEST_ID=$(curl -s -X POST $API_URL/scale \
  -H "Content-Type: application/json" \
  -d "{
    \"targets\": [{\"rps\": $RPS, \"duration\": $DURATION}],
    \"auth_method\": \"MAB\"
  }" | jq -r '.test_id')

echo "Test ID: $TEST_ID"

# Monitor test
while true; do
    STATUS=$(curl -s $API_URL/status/$TEST_ID | jq -r '.status')
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
        break
    fi
    
    # Get current metrics
    METRICS=$(curl -s $API_URL/status/$TEST_ID)
    CURRENT_RPS=$(echo $METRICS | jq -r '.current_rps')
    SUCCESS_RATE=$(echo $METRICS | jq -r '.success_rate')
    AVG_LATENCY=$(echo $METRICS | jq -r '.avg_latency_ms')
    
    echo "$(date): RPS=$CURRENT_RPS, Success=$SUCCESS_RATE%, Latency=${AVG_LATENCY}ms" | tee -a $LOG_FILE
    
    sleep 5
done

# Get final results
curl -s $API_URL/results/$TEST_ID | jq . > test-$TEST_ID-results.json
echo "Test completed. Results saved to test-$TEST_ID-results.json"
EOF

chmod +x continuous-load.sh
./continuous-load.sh
```

## 📊 Metrics & Monitoring via CLI

### 1. Real-time Metrics

```bash
# Get Prometheus metrics
curl -s http://localhost:8916/metrics | grep radiusforge

# Parse specific metrics
curl -s http://localhost:8916/metrics | grep -E "radiusforge_auth_success|radiusforge_auth_failure"

# Create metrics monitoring script
cat > monitor-metrics.sh << 'EOF'
#!/bin/bash

while true; do
    clear
    echo "=== RadiusForge Metrics ==="
    echo "$(date)"
    echo ""
    
    # Get metrics
    METRICS=$(curl -s http://localhost:8916/metrics)
    
    # Parse key metrics
    SUCCESS=$(echo "$METRICS" | grep "radiusforge_auth_success_total" | awk '{print $2}')
    FAILURE=$(echo "$METRICS" | grep "radiusforge_auth_failure_total" | awk '{print $2}')
    LATENCY=$(echo "$METRICS" | grep "radiusforge_auth_latency_seconds" | tail -1 | awk '{print $2}')
    RPS=$(echo "$METRICS" | grep "radiusforge_rps_current" | awk '{print $2}')
    
    echo "Authentication Success: ${SUCCESS:-0}"
    echo "Authentication Failure: ${FAILURE:-0}"
    echo "Current RPS: ${RPS:-0}"
    echo "Average Latency: ${LATENCY:-0}s"
    
    # Calculate success rate
    if [ -n "$SUCCESS" ] && [ -n "$FAILURE" ]; then
        TOTAL=$((SUCCESS + FAILURE))
        if [ $TOTAL -gt 0 ]; then
            RATE=$((SUCCESS * 100 / TOTAL))
            echo "Success Rate: ${RATE}%"
        fi
    fi
    
    sleep 2
done
EOF

chmod +x monitor-metrics.sh
./monitor-metrics.sh
```

### 2. Log Streaming

```bash
# Stream application logs
tail -f /opt/radiusforge/logs/api.log

# Stream RADIUS test logs
tail -f /opt/radiusforge/logs/radius.log | grep -E "SUCCESS|FAILURE"

# Create log analysis script
cat > analyze-logs.sh << 'EOF'
#!/bin/bash

LOG_FILE="/opt/radiusforge/logs/radius.log"

echo "=== RADIUS Log Analysis ==="
echo ""

# Count by authentication method
echo "Authentication Methods:"
grep -o "method=[^ ]*" $LOG_FILE | sort | uniq -c | sort -rn

echo ""
echo "Top Failed Users:"
grep "FAILURE" $LOG_FILE | grep -o "user=[^ ]*" | sort | uniq -c | sort -rn | head -10

echo ""
echo "Response Time Distribution:"
grep -o "latency=[0-9]*ms" $LOG_FILE | sed 's/latency=//;s/ms//' | \
    awk '{
        if ($1 < 10) bins["<10ms"]++
        else if ($1 < 50) bins["10-50ms"]++
        else if ($1 < 100) bins["50-100ms"]++
        else if ($1 < 500) bins["100-500ms"]++
        else bins[">500ms"]++
    } END {
        for (b in bins) print b": "bins[b]
    }' | sort
EOF

chmod +x analyze-logs.sh
./analyze-logs.sh
```

## 🔐 RADIUS Server Testing

### 1. Direct RADIUS Testing

```bash
# Install radtest if not available
sudo yum install -y freeradius-utils  # RHEL/CentOS
brew install freeradius-server  # macOS

# Test against real RADIUS server
radtest testuser TestPass123 192.168.1.10 0 RadiusForge2024Secret

# Test with specific attributes
echo "User-Name=testuser
User-Password=TestPass123
NAS-IP-Address=10.0.0.1
NAS-Port=1
Called-Station-Id=AA:BB:CC:DD:EE:FF
Calling-Station-Id=00:11:22:33:44:55" | \
radclient -x 192.168.1.10:1812 auth RadiusForge2024Secret
```

### 2. Bulk RADIUS Testing

```bash
# Create user file for bulk testing
cat > users.txt << EOF
user1:pass1
user2:pass2
user3:pass3
user4:pass4
user5:pass5
EOF

# Bulk test script
cat > bulk-radius-test.sh << 'EOF'
#!/bin/bash

RADIUS_SERVER="192.168.1.10"
RADIUS_SECRET="RadiusForge2024Secret"
USERS_FILE="users.txt"
RESULTS_FILE="radius-test-results.txt"

echo "Starting bulk RADIUS tests..." | tee $RESULTS_FILE
echo "=========================" | tee -a $RESULTS_FILE

while IFS=: read -r username password; do
    echo -n "Testing $username... " | tee -a $RESULTS_FILE
    
    RESULT=$(radtest $username $password $RADIUS_SERVER 0 $RADIUS_SECRET 2>&1)
    
    if echo "$RESULT" | grep -q "Access-Accept"; then
        echo "✓ SUCCESS" | tee -a $RESULTS_FILE
    else
        echo "✗ FAILED" | tee -a $RESULTS_FILE
    fi
done < $USERS_FILE

echo "=========================" | tee -a $RESULTS_FILE
echo "Test completed. Results in $RESULTS_FILE" | tee -a $RESULTS_FILE
EOF

chmod +x bulk-radius-test.sh
./bulk-radius-test.sh
```

## 🎯 Advanced CLI Operations

### 1. Performance Testing

```bash
# Create performance test suite
cat > performance-test.sh << 'EOF'
#!/bin/bash

# RadiusForge Performance Test Suite

API_URL="http://localhost:8910/api"

echo "=== RadiusForge Performance Test Suite ==="
echo ""

# Test 1: Latency Test
echo "Test 1: Latency Measurement"
for i in {1..10}; do
    START=$(date +%s%N)
    curl -s -X POST $API_URL/test/auth \
        -H "Content-Type: application/json" \
        -d '{"method":"MAB","mac_address":"00:11:22:33:44:55"}' > /dev/null
    END=$(date +%s%N)
    LATENCY=$((($END - $START) / 1000000))
    echo "  Request $i: ${LATENCY}ms"
done

echo ""
echo "Test 2: Throughput Test"
START=$(date +%s)
for i in {1..100}; do
    curl -s -X POST $API_URL/test/auth \
        -H "Content-Type: application/json" \
        -d '{"method":"MAB","mac_address":"00:11:22:33:44:55"}' > /dev/null &
done
wait
END=$(date +%s)
DURATION=$(($END - $START))
RPS=$((100 / $DURATION))
echo "  Completed 100 requests in ${DURATION}s (${RPS} RPS)"

echo ""
echo "Test 3: Concurrent Connections"
for concurrency in 10 50 100 200; do
    echo -n "  Testing with $concurrency concurrent connections... "
    
    START=$(date +%s)
    for i in $(seq 1 $concurrency); do
        curl -s -X POST $API_URL/test/auth \
            -H "Content-Type: application/json" \
            -d '{"method":"MAB","mac_address":"00:11:22:33:44:55"}' > /dev/null &
    done
    wait
    END=$(date +%s)
    
    DURATION=$(($END - $START))
    echo "${DURATION}s"
done
EOF

chmod +x performance-test.sh
./performance-test.sh
```

### 2. Automated Configuration Testing

```bash
# Test different RADIUS configurations
cat > test-configs.sh << 'EOF'
#!/bin/bash

# Test different RADIUS server configurations

CONFIGS=(
    "access-manager:192.168.1.10:1812:secret1"
    "cisco-ise:10.0.0.100:1812:secret2"
    "cisco-ise:10.0.0.101:1812:secret3"
)

for config in "${CONFIGS[@]}"; do
    IFS=: read -r server_type host port secret <<< "$config"
    
    echo "Testing configuration: $server_type at $host:$port"
    
    # Update configuration
    curl -X PUT http://localhost:8910/api/config \
        -H "Content-Type: application/json" \
        -d "{
            \"radius_server_type\": \"$server_type\",
            \"radius_primary_host\": \"$host\",
            \"radius_primary_port\": $port,
            \"radius_primary_secret\": \"$secret\"
        }"
    
    # Test authentication
    RESULT=$(curl -s -X POST http://localhost:8910/api/test/auth \
        -H "Content-Type: application/json" \
        -d '{"method":"MAB","mac_address":"00:11:22:33:44:55"}')
    
    SUCCESS=$(echo $RESULT | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        echo "  ✓ Configuration working"
    else
        echo "  ✗ Configuration failed"
    fi
    echo ""
done
EOF

chmod +x test-configs.sh
./test-configs.sh
```

### 3. Report Generation

```bash
# Generate test report
cat > generate-report.sh << 'EOF'
#!/bin/bash

# RadiusForge CLI Report Generator

REPORT_FILE="radiusforge-report-$(date +%Y%m%d-%H%M%S).txt"

echo "==================================" > $REPORT_FILE
echo "RadiusForge Test Report" >> $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "==================================" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# System Information
echo "System Information:" >> $REPORT_FILE
echo "------------------" >> $REPORT_FILE
curl -s http://localhost:8910/api/version | jq . >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Configuration
echo "Current Configuration:" >> $REPORT_FILE
echo "---------------------" >> $REPORT_FILE
curl -s http://localhost:8910/api/config | jq . >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Health Status
echo "Health Status:" >> $REPORT_FILE
echo "-------------" >> $REPORT_FILE
curl -s http://localhost:8917/health | jq . >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Metrics Summary
echo "Metrics Summary:" >> $REPORT_FILE
echo "---------------" >> $REPORT_FILE
METRICS=$(curl -s http://localhost:8916/metrics)
echo "Total Authentications: $(echo "$METRICS" | grep "radiusforge_auth_total" | awk '{print $2}')" >> $REPORT_FILE
echo "Successful: $(echo "$METRICS" | grep "radiusforge_auth_success_total" | awk '{print $2}')" >> $REPORT_FILE
echo "Failed: $(echo "$METRICS" | grep "radiusforge_auth_failure_total" | awk '{print $2}')" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Recent Test Results
echo "Recent Test Results:" >> $REPORT_FILE
echo "-------------------" >> $REPORT_FILE
curl -s http://localhost:8910/api/test/recent | jq . >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "Report saved to: $REPORT_FILE"

# Optional: Send report via email
# mail -s "RadiusForge Report $(date +%Y%m%d)" admin@example.com < $REPORT_FILE
EOF

chmod +x generate-report.sh
./generate-report.sh
```

## 🔄 Automation Examples

### 1. Cron Jobs for Regular Testing

```bash
# Add to crontab
crontab -e

# Run authentication test every 5 minutes
*/5 * * * * /opt/radiusforge/scripts/auth-test.sh >> /var/log/radiusforge-test.log 2>&1

# Run load test every hour
0 * * * * /opt/radiusforge/scripts/load-test.sh >> /var/log/radiusforge-load.log 2>&1

# Generate daily report
0 2 * * * /opt/radiusforge/scripts/generate-report.sh

# Clean up old logs weekly
0 3 * * 0 find /opt/radiusforge/logs -name "*.log" -mtime +7 -delete
```

### 2. CI/CD Integration

```bash
# Jenkins/GitLab CI pipeline script
cat > ci-test.sh << 'EOF'
#!/bin/bash

# CI/CD Integration Test Script

set -e

echo "Starting RadiusForge CI tests..."

# Start services
docker run -d --name radiusforge-ci -p 8910-8926:8910-8926 radiusforge:1.4.0-allinone

# Wait for services
sleep 10

# Run health check
curl -f http://localhost:8917/health || exit 1

# Run authentication tests
./batch-auth-test.sh || exit 1

# Run load test
curl -X POST http://localhost:8910/api/test/scale \
    -H "Content-Type: application/json" \
    -d '{"targets":[{"rps":100,"duration":30}],"auth_method":"MAB"}' || exit 1

# Check success rate
SUCCESS_RATE=$(curl -s http://localhost:8916/metrics | \
    grep radiusforge_auth_success_rate | awk '{print $2}')

if (( $(echo "$SUCCESS_RATE < 95" | bc -l) )); then
    echo "Success rate too low: $SUCCESS_RATE%"
    exit 1
fi

echo "All tests passed!"

# Cleanup
docker stop radiusforge-ci
docker rm radiusforge-ci
EOF

chmod +x ci-test.sh
```

## 📌 Quick Reference

### Essential CLI Commands

```bash
# Service Control
systemctl start|stop|restart|status radiusforge
docker start|stop|restart radiusforge

# Health Checks
curl http://localhost:8917/health
curl http://localhost:8910/api/status

# Quick Auth Test
curl -X POST http://localhost:8910/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"method":"MAB","mac_address":"00:11:22:33:44:55"}'

# View Metrics
curl http://localhost:8916/metrics | grep radiusforge

# Tail Logs
tail -f /opt/radiusforge/logs/api.log
docker logs -f radiusforge

# Configuration
vi /opt/radiusforge/.env
docker exec radiusforge cat /opt/radiusforge/config/radiusforge.conf
```

### Useful Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias rf-status='curl -s http://localhost:8917/health | jq .'
alias rf-test='curl -X POST http://localhost:8910/api/test/auth -H "Content-Type: application/json" -d'
alias rf-metrics='curl -s http://localhost:8916/metrics | grep radiusforge'
alias rf-logs='tail -f /opt/radiusforge/logs/api.log'
alias rf-config='sudo nano /opt/radiusforge/.env'
```

## 🎯 Summary

This CLI-only guide provides everything needed to:
- Configure RadiusForge without GUI
- Run authentication tests programmatically
- Execute load tests via API
- Monitor metrics and logs
- Automate testing workflows
- Integrate with CI/CD pipelines
- Generate reports from command line

All operations can be scripted and automated for headless environments or integration with existing tools and workflows.

---

**Version**: 1.4.0  
**API Base URL**: http://localhost:8910/api  
**Metrics URL**: http://localhost:8916/metrics  
**Health URL**: http://localhost:8917/health  

© 2024 RadiusForge - Enterprise AAA Testing Platform
