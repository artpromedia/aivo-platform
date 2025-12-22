#!/usr/bin/env bash
# AIVO E2E Test Runner
# Run Patrol E2E tests for mobile apps

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/reports"

# Default values
APP="all"
PLATFORM="android"
TAG="smoke"
FLAVOR="dev"
SHARDS=1
SHARD_INDEX=0
HEADLESS=false
VERBOSE=false

# Usage
usage() {
    echo -e "${BLUE}AIVO E2E Test Runner${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -a, --app         App to test: parent, teacher, learner, cross, all (default: all)"
    echo "  -p, --platform    Platform: android, ios (default: android)"
    echo "  -t, --tag         Test tag: smoke, regression, critical, all (default: smoke)"
    echo "  -f, --flavor      Build flavor: dev, staging, prod (default: dev)"
    echo "  -s, --shards      Number of shards for parallel execution (default: 1)"
    echo "  -i, --shard-index Shard index to run (default: 0)"
    echo "  -h, --headless    Run in headless mode"
    echo "  -v, --verbose     Verbose output"
    echo "  --help            Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --app parent --platform android"
    echo "  $0 --app all --tag regression --shards 4 --shard-index 0"
    echo "  $0 --app learner --platform ios --headless"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--app)
            APP="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -f|--flavor)
            FLAVOR="$2"
            shift 2
            ;;
        -s|--shards)
            SHARDS="$2"
            shift 2
            ;;
        -i|--shard-index)
            SHARD_INDEX="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Flutter
    if ! command -v flutter &> /dev/null; then
        log_error "Flutter not found. Please install Flutter first."
        exit 1
    fi
    
    # Check Patrol CLI
    if ! command -v patrol &> /dev/null; then
        log_warn "Patrol CLI not found. Installing..."
        dart pub global activate patrol_cli
    fi
    
    # Check platform-specific tools
    if [[ "$PLATFORM" == "android" ]]; then
        if ! command -v adb &> /dev/null; then
            log_error "ADB not found. Please install Android SDK."
            exit 1
        fi
        
        # Check emulator running
        if ! adb devices | grep -q "emulator"; then
            log_warn "No Android emulator running. Starting one..."
            emulator -avd Pixel_6_API_33 -no-snapshot-save &
            sleep 30
        fi
    elif [[ "$PLATFORM" == "ios" ]]; then
        if ! command -v xcrun &> /dev/null; then
            log_error "Xcode tools not found. Please install Xcode."
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Setup reports directory
setup_reports() {
    mkdir -p "$REPORTS_DIR/screenshots"
    mkdir -p "$REPORTS_DIR/logs"
    mkdir -p "$REPORTS_DIR/junit"
}

# Build apps
build_apps() {
    local apps=("$@")
    
    for app in "${apps[@]}"; do
        log_info "Building $app app for $PLATFORM..."
        
        cd "$PROJECT_ROOT/../apps/mobile-$app"
        flutter pub get
        
        if [[ "$PLATFORM" == "android" ]]; then
            patrol build android --flavor "$FLAVOR"
        else
            if [[ "$HEADLESS" == true ]]; then
                patrol build ios --flavor "$FLAVOR" --simulator
            else
                patrol build ios --flavor "$FLAVOR"
            fi
        fi
        
        log_success "Built $app app"
    done
    
    cd "$PROJECT_ROOT"
}

# Run tests for an app
run_tests() {
    local app=$1
    local target_dir="integration_test/${app}_app"
    
    if [[ "$app" == "cross" ]]; then
        target_dir="integration_test/cross_app"
    fi
    
    log_info "Running E2E tests for $app on $PLATFORM..."
    
    local patrol_args=(
        "--target" "$target_dir"
        "--flavor" "$FLAVOR"
        "--dart-define=TEST_ENV=test"
    )
    
    if [[ $SHARDS -gt 1 ]]; then
        patrol_args+=("--shard-index" "$SHARD_INDEX")
        patrol_args+=("--shard-count" "$SHARDS")
    fi
    
    if [[ "$TAG" != "all" ]]; then
        patrol_args+=("--tags" "$TAG")
    fi
    
    if [[ "$VERBOSE" == true ]]; then
        patrol_args+=("--verbose")
    fi
    
    # Set environment variables
    export HEADLESS="$HEADLESS"
    export SHARD_INDEX="$SHARD_INDEX"
    export TOTAL_SHARDS="$SHARDS"
    
    # Run patrol
    patrol test "${patrol_args[@]}" 2>&1 | tee "$REPORTS_DIR/logs/${app}_${PLATFORM}.log"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "Tests passed for $app"
    else
        log_error "Tests failed for $app"
    fi
    
    return $exit_code
}

# Main execution
main() {
    log_info "Starting AIVO E2E Test Runner"
    log_info "Configuration:"
    log_info "  App: $APP"
    log_info "  Platform: $PLATFORM"
    log_info "  Tag: $TAG"
    log_info "  Flavor: $FLAVOR"
    log_info "  Shards: $SHARDS (index: $SHARD_INDEX)"
    log_info "  Headless: $HEADLESS"
    echo ""
    
    check_prerequisites
    setup_reports
    
    # Determine which apps to test
    local apps=()
    if [[ "$APP" == "all" ]]; then
        apps=("parent" "teacher" "learner")
    else
        apps=("$APP")
    fi
    
    # Build apps (skip for cross-app which uses pre-built)
    if [[ "$APP" != "cross" ]]; then
        build_apps "${apps[@]}"
    fi
    
    # Run tests
    local failed=0
    for app in "${apps[@]}"; do
        if ! run_tests "$app"; then
            ((failed++))
        fi
    done
    
    # Summary
    echo ""
    if [[ $failed -eq 0 ]]; then
        log_success "All tests passed! ✓"
    else
        log_error "$failed app(s) had test failures"
        exit 1
    fi
}

main
