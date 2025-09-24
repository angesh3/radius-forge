#!/bin/bash
# RadiusForge Update Script v1.3.0
# Handles delta updates between versions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RADIUSFORGE_HOME="/opt/radiusforge"
BACKUP_DIR="$RADIUSFORGE_HOME/backups"
UPDATE_LOG="$BACKUP_DIR/update.log"

# Logging
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$UPDATE_LOG"
}

error() {
    local message="[ERROR] $1"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$UPDATE_LOG"
    exit 1
}

warning() {
    local message="[WARNING] $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$UPDATE_LOG"
}

success() {
    local message="[SUCCESS] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$UPDATE_LOG"
}

# Check if delta bundle exists
check_delta_bundle() {
    if [ ! -f "manifest.json" ]; then
        error "manifest.json not found. This doesn't appear to be a valid delta update bundle."
    fi
    
    # Parse manifest
    FROM_VERSION=$(python3 -c "import json; print(json.load(open('manifest.json')).get('from_version', 'unknown'))")
    TO_VERSION=$(python3 -c "import json; print(json.load(open('manifest.json')).get('to_version', 'unknown'))")
    BUNDLE_TYPE=$(python3 -c "import json; print(json.load(open('manifest.json')).get('bundle_type', 'unknown'))")
    
    if [ "$BUNDLE_TYPE" != "delta" ]; then
        error "This is not a delta update bundle (type: $BUNDLE_TYPE)"
    fi
    
    log "Delta update: $FROM_VERSION → $TO_VERSION"
}

# Get current version
get_current_version() {
    if [ -f "$RADIUSFORGE_HOME/app/VERSION" ]; then
        CURRENT_VERSION=$(cat "$RADIUSFORGE_HOME/app/VERSION")
    else
        CURRENT_VERSION="unknown"
    fi
    
    log "Current version: $CURRENT_VERSION"
}

# Validate version compatibility
validate_version() {
    if [ "$CURRENT_VERSION" != "$FROM_VERSION" ]; then
        error "Version mismatch. Current: $CURRENT_VERSION, Expected: $FROM_VERSION"
    fi
    
    success "Version validation passed"
}

# Create backup
create_backup() {
    log "Creating backup of current installation..."
    
    local backup_name="backup-$CURRENT_VERSION-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup application files
    if [ -d "$RADIUSFORGE_HOME/app" ]; then
        cp -r "$RADIUSFORGE_HOME/app" "$backup_path/"
    fi
    
    # Backup configuration
    if [ -d "$RADIUSFORGE_HOME/config" ]; then
        cp -r "$RADIUSFORGE_HOME/config" "$backup_path/"
    fi
    
    # Backup data (if exists)
    if [ -d "$RADIUSFORGE_HOME/data" ]; then
        cp -r "$RADIUSFORGE_HOME/data" "$backup_path/"
    fi
    
    # Create backup manifest
    cat > "$backup_path/backup_info.json" << EOF
{
    "version": "$CURRENT_VERSION",
    "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "backup_type": "pre_update",
    "backup_reason": "Update from $CURRENT_VERSION to $TO_VERSION"
}
EOF
    
    echo "$backup_path" > "$BACKUP_DIR/latest_backup"
    success "Backup created: $backup_path"
}

# Stop services
stop_services() {
    log "Stopping RadiusForge services..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sudo launchctl unload /Library/LaunchDaemons/com.radiusforge.api.plist 2>/dev/null || true
        sleep 2
    else
        # Linux
        if command -v systemctl &> /dev/null; then
            sudo systemctl stop radiusforge-ui radiusforge-api || true
            sleep 2
        else
            # Fallback - kill processes
            pkill -f "uvicorn.*main_simple" || true
            pkill -f "npm.*serve" || true
            sleep 2
        fi
    fi
    
    success "Services stopped"
}

# Apply delta updates
apply_delta() {
    log "Applying delta updates..."
    
    # Parse file list from manifest
    local files=$(python3 -c "
import json
manifest = json.load(open('manifest.json'))
for f in manifest.get('files', []):
    print(f)
")
    
    local updated_count=0
    
    # Copy updated files
    while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            local target_path="$RADIUSFORGE_HOME/app/$file"
            local target_dir=$(dirname "$target_path")
            
            # Create directory if it doesn't exist
            mkdir -p "$target_dir"
            
            # Copy file with ownership preservation
            cp "$file" "$target_path"
            
            # Set ownership
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sudo chown "$(whoami):staff" "$target_path"
            else
                sudo chown radiusforge:radiusforge "$target_path"
            fi
            
            updated_count=$((updated_count + 1))
            log "Updated: $file"
        fi
    done <<< "$files"
    
    # Handle deleted files
    local deleted_files=$(python3 -c "
import json
manifest = json.load(open('manifest.json'))
for f in manifest.get('deleted_files', []):
    print(f)
")
    
    local deleted_count=0
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            local target_path="$RADIUSFORGE_HOME/app/$file"
            if [ -f "$target_path" ]; then
                rm "$target_path"
                deleted_count=$((deleted_count + 1))
                log "Deleted: $file"
            fi
        fi
    done <<< "$deleted_files"
    
    success "Applied $updated_count updates and $deleted_count deletions"
}

# Update version file
update_version() {
    log "Updating version file..."
    echo "$TO_VERSION" > "$RADIUSFORGE_HOME/app/VERSION"
    success "Version updated to $TO_VERSION"
}

# Update dependencies
update_dependencies() {
    log "Checking for dependency updates..."
    
    # Check if requirements.txt was updated
    if [ -f "$RADIUSFORGE_HOME/app/requirements.txt" ]; then
        log "Updating Python dependencies..."
        sudo -u radiusforge "$RADIUSFORGE_HOME/venv/bin/pip" install -r "$RADIUSFORGE_HOME/app/requirements.txt" --upgrade
        success "Python dependencies updated"
    fi
    
    # Check if package.json was updated
    if [ -f "$RADIUSFORGE_HOME/app/ui/package.json" ]; then
        log "Checking Node.js dependencies..."
        cd "$RADIUSFORGE_HOME/app/ui"
        
        # Check if package.json changed
        if python3 -c "
import json
manifest = json.load(open('../../manifest.json'))
files = manifest.get('files', [])
print('updated' if 'ui/package.json' in files else 'unchanged')
" | grep -q "updated"; then
            log "Updating Node.js dependencies..."
            sudo -u radiusforge npm install
            sudo -u radiusforge npm run build
            success "UI dependencies updated and rebuilt"
        else
            log "No UI dependency updates needed"
        fi
    fi
}

# Verify checksums
verify_checksums() {
    log "Verifying file integrity..."
    
    local verification_failed=0
    
    # Parse checksums from manifest
    python3 -c "
import json
import hashlib
import sys

manifest = json.load(open('manifest.json'))
checksums = manifest.get('checksums', {})

for file_path, expected_hash in checksums.items():
    full_path = '$RADIUSFORGE_HOME/app/' + file_path
    try:
        with open(full_path, 'rb') as f:
            actual_hash = hashlib.sha256(f.read()).hexdigest()
        
        if actual_hash == expected_hash:
            print(f'OK: {file_path}')
        else:
            print(f'FAIL: {file_path}')
            sys.exit(1)
    except FileNotFoundError:
        print(f'MISSING: {file_path}')
        sys.exit(1)
" || verification_failed=1
    
    if [ $verification_failed -eq 1 ]; then
        error "Checksum verification failed. Update may be corrupted."
    fi
    
    success "File integrity verified"
}

# Start services
start_services() {
    log "Starting RadiusForge services..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sudo launchctl load /Library/LaunchDaemons/com.radiusforge.api.plist
    else
        # Linux
        if command -v systemctl &> /dev/null; then
            sudo systemctl start radiusforge-api
            sleep 3
            sudo systemctl start radiusforge-ui
        else
            error "Cannot start services automatically. Please start manually."
        fi
    fi
    
    sleep 5
    success "Services started"
}

# Validate update
validate_update() {
    log "Validating update..."
    
    local retries=0
    local max_retries=15
    
    # Check API health
    while [ $retries -lt $max_retries ]; do
        if curl -s http://localhost:8910/health > /dev/null; then
            success "API health check passed"
            break
        fi
        
        retries=$((retries + 1))
        if [ $retries -eq $max_retries ]; then
            error "API health check failed after $max_retries attempts"
        fi
        
        sleep 2
    done
    
    # Check version endpoint
    local api_version=$(curl -s http://localhost:8910/api/system/version | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    print(data.get('version', 'unknown'))
except:
    print('error')
")
    
    if [ "$api_version" = "$TO_VERSION" ]; then
        success "Version validation passed (API reports: $api_version)"
    else
        warning "Version mismatch in API response (expected: $TO_VERSION, got: $api_version)"
    fi
    
    # Check ports
    local ports_available=$(curl -s http://localhost:8910/api/system/ports | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    ports = data.get('ports', {})
    print(len(ports))
except:
    print('0')
")
    
    if [ "$ports_available" -ge 10 ]; then
        success "Port configuration validated ($ports_available ports configured)"
    else
        warning "Port configuration may be incomplete ($ports_available ports found)"
    fi
}

# Cleanup
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove old backups (keep last 5)
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR" | grep "^backup-" | wc -l)
        if [ "$backup_count" -gt 5 ]; then
            ls -1t "$BACKUP_DIR" | grep "^backup-" | tail -n +6 | while read old_backup; do
                rm -rf "$BACKUP_DIR/$old_backup"
                log "Removed old backup: $old_backup"
            done
        fi
    fi
    
    success "Cleanup completed"
}

# Rollback function
rollback() {
    error_msg="$1"
    
    echo ""
    echo "================================================"
    echo "                ROLLBACK INITIATED             "
    echo "================================================"
    echo ""
    
    warning "Update failed: $error_msg"
    
    if [ -f "$BACKUP_DIR/latest_backup" ]; then
        local backup_path=$(cat "$BACKUP_DIR/latest_backup")
        
        if [ -d "$backup_path" ]; then
            log "Rolling back to previous version..."
            
            # Stop services
            stop_services
            
            # Restore files
            if [ -d "$backup_path/app" ]; then
                rm -rf "$RADIUSFORGE_HOME/app"
                cp -r "$backup_path/app" "$RADIUSFORGE_HOME/"
                
                # Set ownership
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sudo chown -R "$(whoami):staff" "$RADIUSFORGE_HOME/app"
                else
                    sudo chown -R radiusforge:radiusforge "$RADIUSFORGE_HOME/app"
                fi
            fi
            
            # Restore configuration
            if [ -d "$backup_path/config" ]; then
                rm -rf "$RADIUSFORGE_HOME/config"
                cp -r "$backup_path/config" "$RADIUSFORGE_HOME/"
            fi
            
            # Start services
            start_services
            
            success "Rollback completed successfully"
            echo "System has been restored to the previous version."
        else
            error "Backup not found at: $backup_path"
        fi
    else
        error "No backup available for rollback"
    fi
}

# Main update function
main() {
    echo "================================================"
    echo "         RadiusForge Delta Update v1.3.0       "
    echo "================================================"
    echo ""
    
    # Create update log
    mkdir -p "$BACKUP_DIR"
    
    # Trap errors for rollback
    trap 'rollback "Update process failed at step: $BASH_COMMAND"' ERR
    
    # Pre-update validation
    check_delta_bundle
    get_current_version
    validate_version
    
    # Create backup
    create_backup
    
    # Stop services
    stop_services
    
    # Apply updates
    apply_delta
    update_version
    update_dependencies
    verify_checksums
    
    # Start services and validate
    start_services
    validate_update
    
    # Cleanup
    cleanup
    
    # Disable error trap
    trap - ERR
    
    echo ""
    echo "================================================"
    echo "           Update Complete!                     "
    echo "================================================"
    echo ""
    echo "RadiusForge has been successfully updated!"
    echo ""
    echo "Previous version: $FROM_VERSION"
    echo "Current version:  $TO_VERSION"
    echo ""
    echo "🌐 Web UI: http://localhost:8911"
    echo "🔧 API: http://localhost:8910"
    echo "📊 API Docs: http://localhost:8910/docs"
    echo ""
    echo "Service Management:"
    echo "  radiusforge-ctl start|stop|restart|status|logs"
    echo ""
    echo "Backup location: $(cat $BACKUP_DIR/latest_backup 2>/dev/null || echo 'Not available')"
    echo ""
    success "Update completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    --rollback)
        if [ -f "$BACKUP_DIR/latest_backup" ]; then
            rollback "Manual rollback requested"
        else
            error "No backup available for rollback"
        fi
        ;;
    --version)
        check_delta_bundle
        echo "Delta update: $FROM_VERSION → $TO_VERSION"
        ;;
    --help|-h)
        echo "RadiusForge Delta Update Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --rollback    Rollback to previous version"
        echo "  --version     Show update version information"
        echo "  --help        Show this help message"
        echo ""
        echo "To apply the delta update, run without arguments:"
        echo "  $0"
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1. Use --help for usage information."
        ;;
esac