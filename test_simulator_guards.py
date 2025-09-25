#!/usr/bin/env python3
"""Test simulator import guards"""

import sys
import os
sys.path.insert(0, 'src')

def test_simulator_blocked():
    """Test that simulators are blocked without ALLOW_SIMULATORS=1"""
    try:
        from simulators import radius_sim
        print('ERROR: Simulator imported without ALLOW_SIMULATORS=1')
        return False
    except ImportError as e:
        if 'test-only' in str(e):
            print('SUCCESS: Simulator properly blocked without ALLOW_SIMULATORS=1')
            return True
        else:
            print(f'ERROR: Unexpected import error: {e}')
            return False

def test_simulator_allowed():
    """Test that simulators work with ALLOW_SIMULATORS=1"""
    os.environ['ALLOW_SIMULATORS'] = '1'
    try:
        from simulators import radius_sim
        print('SUCCESS: Simulator imported with ALLOW_SIMULATORS=1')
        return True
    except ImportError as e:
        print(f'ERROR: Simulator failed to import with ALLOW_SIMULATORS=1: {e}')
        return False
    finally:
        if 'ALLOW_SIMULATORS' in os.environ:
            del os.environ['ALLOW_SIMULATORS']

if __name__ == '__main__':
    success1 = test_simulator_blocked()
    success2 = test_simulator_allowed()
    
    if success1 and success2:
        print('All simulator guard tests passed!')
        sys.exit(0)
    else:
        print('Some simulator guard tests failed!')
        sys.exit(1)
