#!/usr/bin/env python3
"""
Test Runner for RadiusForge
Provides convenient commands to run different test suites
"""

import subprocess
import sys
import argparse
from pathlib import Path


def run_command(cmd, description):
    """Run a command and print results"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
        else:
            print(f"❌ {description} failed with code {result.returncode}")
        
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running {description}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="RadiusForge Test Runner")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--e2e", action="store_true", help="Run end-to-end tests only")
    parser.add_argument("--fast", action="store_true", help="Run fast tests only (exclude slow)")
    parser.add_argument("--coverage", action="store_true", help="Run with coverage report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--file", help="Run specific test file")
    parser.add_argument("--test", help="Run specific test function")
    
    args = parser.parse_args()
    
    # Base pytest command
    base_cmd = ["python", "-m", "pytest"]
    
    if args.verbose:
        base_cmd.append("-v")
    
    if args.coverage:
        base_cmd.extend(["--cov=src", "--cov-report=html", "--cov-report=term-missing"])
    
    success = True
    
    if args.file:
        # Run specific test file
        cmd = base_cmd + [f"tests/{args.file}"]
        if args.test:
            cmd.append(f"-k {args.test}")
        success = run_command(cmd, f"Test file: {args.file}")
    
    elif args.unit:
        # Run unit tests
        cmd = base_cmd + ["-m", "unit", "tests/unit/"]
        if args.fast:
            cmd.extend(["-m", "not slow"])
        success = run_command(cmd, "Unit Tests")
    
    elif args.integration:
        # Run integration tests
        cmd = base_cmd + ["-m", "integration", "tests/integration/"]
        if args.fast:
            cmd.extend(["-m", "not slow"])
        success = run_command(cmd, "Integration Tests")
    
    elif args.e2e:
        # Run e2e tests
        cmd = base_cmd + ["-m", "e2e", "tests/e2e/"]
        success = run_command(cmd, "End-to-End Tests")
    
    elif args.fast:
        # Run fast tests only
        cmd = base_cmd + ["-m", "not slow", "tests/"]
        success = run_command(cmd, "Fast Tests")
    
    else:
        # Run all tests in sequence
        print("Running complete test suite...")
        
        # Unit tests
        cmd = base_cmd + ["-m", "unit", "tests/unit/"]
        if args.coverage:
            cmd.extend(["--cov=src", "--cov-report=html:htmlcov/unit"])
        success &= run_command(cmd, "Unit Tests")
        
        # Integration tests  
        cmd = base_cmd + ["-m", "integration", "tests/integration/"]
        if args.coverage:
            cmd.extend(["--cov=src", "--cov-append", "--cov-report=html:htmlcov/integration"])
        success &= run_command(cmd, "Integration Tests")
        
        # E2E tests
        cmd = base_cmd + ["-m", "e2e", "tests/e2e/"]
        if args.coverage:
            cmd.extend(["--cov=src", "--cov-append", "--cov-report=html:htmlcov/e2e"])
        success &= run_command(cmd, "End-to-End Tests")
    
    if success:
        print("\n🎉 All tests completed successfully!")
        if args.coverage:
            print("📊 Coverage report available in htmlcov/")
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()