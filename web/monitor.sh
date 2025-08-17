#!/bin/bash

# ZigZag Web Health Monitoring Script
# Continuously monitors the health of the application and its dependencies

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3001}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
LOG_FILE="${LOG_FILE:-logs/monitor.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Statistics
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
UPTIME_START=$(date +%s)

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case $level in
        ERROR)
            echo -e "${RED}[$timestamp] $message${NC}"
            ;;
        WARN)
            echo -e "${YELLOW}[$timestamp] $message${NC}"
            ;;
        INFO)
            echo -e "${GREEN}[$timestamp] $message${NC}"
            ;;
        *)
            echo "[$timestamp] $message"
            ;;
    esac
}

# Function to send alerts
send_alert() {
    local message=$1
    local severity=${2:-warning}
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 ZigZag Alert: $message\",\"severity\":\"$severity\"}" \
            2>/dev/null || true
    fi
    
    # Log to file
    log ERROR "ALERT: $message"
}

# Function to check application health
check_app_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health" --max-time 10)
    
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check API response time
check_response_time() {
    local start_time=$(date +%s%N)
    curl -s "$APP_URL/health" > /dev/null 2>&1
    local end_time=$(date +%s%N)
    
    local response_time=$(( ($end_time - $start_time) / 1000000 ))
    
    if [ $response_time -gt 2000 ]; then
        log WARN "Slow response time: ${response_time}ms"
        return 1
    fi
    
    return 0
}

# Function to check database connectivity
check_database() {
    # Check PostgreSQL
    if pg_isready -h ${DATABASE_URL%/*} 2>/dev/null; then
        echo -n ""
    else
        log ERROR "PostgreSQL is not responding"
        return 1
    fi
    
    # Check via API endpoint
    local response=$(curl -s "$APP_URL/api/health/db" 2>/dev/null | grep -o '"status":"ok"' || echo "")
    if [ -z "$response" ]; then
        return 1
    fi
    
    return 0
}

# Function to check disk space
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ $usage -gt 90 ]; then
        send_alert "Disk usage critical: ${usage}%" "critical"
        return 1
    elif [ $usage -gt 80 ]; then
        log WARN "Disk usage high: ${usage}%"
    fi
    
    return 0
}

# Function to check memory usage
check_memory() {
    if command -v free &> /dev/null; then
        local mem_available=$(free -m | awk 'NR==2 {print $7}')
        local mem_total=$(free -m | awk 'NR==2 {print $2}')
        local mem_percent=$(( 100 - (mem_available * 100 / mem_total) ))
        
        if [ $mem_percent -gt 90 ]; then
            send_alert "Memory usage critical: ${mem_percent}%" "critical"
            return 1
        elif [ $mem_percent -gt 80 ]; then
            log WARN "Memory usage high: ${mem_percent}%"
        fi
    fi
    
    return 0
}

# Function to check CPU usage
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
    
    if [ -n "$cpu_usage" ] && [ $cpu_usage -gt 90 ]; then
        send_alert "CPU usage critical: ${cpu_usage}%" "critical"
        return 1
    elif [ -n "$cpu_usage" ] && [ $cpu_usage -gt 80 ]; then
        log WARN "CPU usage high: ${cpu_usage}%"
    fi
    
    return 0
}

# Function to check active connections
check_connections() {
    local connections=$(netstat -an | grep :3001 | grep ESTABLISHED | wc -l)
    
    if [ $connections -gt 1000 ]; then
        log WARN "High number of connections: $connections"
    fi
    
    return 0
}

# Function to display statistics
display_stats() {
    local current_time=$(date +%s)
    local uptime=$(( current_time - UPTIME_START ))
    local uptime_hours=$(( uptime / 3600 ))
    local uptime_minutes=$(( (uptime % 3600) / 60 ))
    
    local success_rate=0
    if [ $CHECKS_TOTAL -gt 0 ]; then
        success_rate=$(( CHECKS_PASSED * 100 / CHECKS_TOTAL ))
    fi
    
    clear
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  ZigZag Web Health Monitor${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    echo -e "URL: ${YELLOW}$APP_URL${NC}"
    echo -e "Uptime: ${GREEN}${uptime_hours}h ${uptime_minutes}m${NC}"
    echo -e "Check Interval: ${YELLOW}${CHECK_INTERVAL}s${NC}"
    echo ""
    echo -e "${BLUE}--- Statistics ---${NC}"
    echo -e "Total Checks: ${YELLOW}$CHECKS_TOTAL${NC}"
    echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
    echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
    echo -e "Success Rate: ${success_rate}%"
    echo ""
    echo -e "${BLUE}--- Last Check ---${NC}"
}

# Function to perform all health checks
perform_health_checks() {
    local all_passed=true
    
    display_stats
    
    echo -n "Application Health: "
    if check_app_health; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
        all_passed=false
        send_alert "Application health check failed" "critical"
    fi
    
    echo -n "Response Time: "
    if check_response_time; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
    
    echo -n "Database: "
    if check_database; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
        all_passed=false
    fi
    
    echo -n "Disk Space: "
    if check_disk_space; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
    
    echo -n "Memory: "
    if check_memory; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
    
    echo -n "CPU: "
    if check_cpu; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
    
    echo -n "Connections: "
    if check_connections; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️${NC}"
    fi
    
    # Update statistics
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    if [ "$all_passed" = true ]; then
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
    
    echo ""
    echo -e "${BLUE}Press Ctrl+C to stop monitoring${NC}"
}

# Function to cleanup on exit
cleanup() {
    echo ""
    log INFO "Monitoring stopped"
    echo -e "${YELLOW}Monitoring stopped${NC}"
    
    # Display final statistics
    echo ""
    echo -e "${BLUE}Final Statistics:${NC}"
    echo -e "Total Checks: $CHECKS_TOTAL"
    echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
    echo -e "Failed: ${RED}$CHECKS_FAILED${NC}"
    
    exit 0
}

# Main monitoring loop
main() {
    # Setup signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Create log directory if it doesn't exist
    mkdir -p $(dirname "$LOG_FILE")
    
    log INFO "Starting health monitoring for $APP_URL"
    
    while true; do
        perform_health_checks
        sleep $CHECK_INTERVAL
    done
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            APP_URL="$2"
            shift 2
            ;;
        --interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        --webhook)
            ALERT_WEBHOOK="$2"
            shift 2
            ;;
        --log)
            LOG_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --url URL          Application URL (default: http://localhost:3001)"
            echo "  --interval SECONDS Check interval in seconds (default: 30)"
            echo "  --webhook URL      Webhook URL for alerts"
            echo "  --log FILE         Log file path (default: logs/monitor.log)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Start monitoring
main