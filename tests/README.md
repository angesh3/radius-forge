# RadiusForge Test Suite

This directory contains comprehensive tests for the RadiusForge application, organized into unit, integration, and end-to-end test categories.

## Test Structure

```
tests/
├── conftest.py              # Shared test fixtures and configuration
├── pytest.ini              # Pytest configuration (in project root)
├── unit/                    # Unit tests (fast, isolated)
│   ├── test_orchestrator.py        # Multi-agent orchestration tests
│   ├── test_radius_generator.py    # RADIUS packet generation tests
│   └── test_websocket_manager.py   # WebSocket manager unit tests
├── integration/             # Integration tests (database, API)
│   ├── test_api.py                 # FastAPI endpoint tests
│   └── test_websocket.py           # WebSocket integration tests
└── e2e/                     # End-to-end tests (full workflows)
    └── test_scale_test.py          # Complete scale test workflows
```

## Test Categories

### Unit Tests (`tests/unit/`)
- **Fast execution** (< 1 second each)
- **Isolated** (no external dependencies)
- **Mocked** dependencies
- Test individual functions and classes

**Files:**
- `test_orchestrator.py` - Tests the multi-agent orchestration system
- `test_radius_generator.py` - Tests RADIUS packet creation and parsing
- `test_websocket_manager.py` - Tests WebSocket connection management

### Integration Tests (`tests/integration/`)
- **Database integration**
- **API endpoint testing**
- **WebSocket communication**
- Test component interactions

**Files:**
- `test_api.py` - Tests FastAPI endpoints with database
- `test_websocket.py` - Tests WebSocket manager with real connections

### End-to-End Tests (`tests/e2e/`)
- **Complete workflows**
- **Full application stack**
- **Real-world scenarios**
- Test user journeys

**Files:**
- `test_scale_test.py` - Tests complete scale test workflows from creation to completion

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install pytest pytest-asyncio pytest-cov httpx websockets
```

### Quick Start

Run all tests:
```bash
python run_tests.py
```

### Specific Test Categories

Run only unit tests:
```bash
python run_tests.py --unit
```

Run only integration tests:
```bash
python run_tests.py --integration
```

Run only end-to-end tests:
```bash
python run_tests.py --e2e
```

### Fast Tests Only

Skip slow tests (useful for development):
```bash
python run_tests.py --fast
```

### Coverage Reports

Run with coverage analysis:
```bash
python run_tests.py --coverage
```

This generates an HTML coverage report in `htmlcov/`.

### Specific Tests

Run a specific test file:
```bash
python run_tests.py --file unit/test_radius_generator.py
```

Run a specific test function:
```bash
python run_tests.py --file unit/test_radius_generator.py --test test_packet_creation
```

### Direct Pytest Usage

You can also use pytest directly:

```bash
# Run all tests
pytest

# Run with markers
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests only
pytest -m e2e            # E2E tests only
pytest -m "not slow"     # Skip slow tests

# Run specific files
pytest tests/unit/test_radius_generator.py
pytest tests/integration/test_api.py

# Verbose output
pytest -v

# With coverage
pytest --cov=src --cov-report=html
```

## Test Markers

Tests are marked with the following categories:

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests  
- `@pytest.mark.e2e` - End-to-end tests
- `@pytest.mark.slow` - Tests that take > 1 second
- `@pytest.mark.network` - Tests requiring network access
- `@pytest.mark.radius` - RADIUS protocol tests
- `@pytest.mark.websocket` - WebSocket tests
- `@pytest.mark.api` - API endpoint tests
- `@pytest.mark.database` - Database tests

## Test Fixtures

Common fixtures are defined in `conftest.py`:

### Database Fixtures
- `test_settings` - Test application settings
- `test_engine` - Test database engine
- `db_session` - Clean database session per test
- `sample_test_run` - Sample test run data
- `sample_metrics` - Sample metrics data

### API Fixtures
- `test_app` - FastAPI test application
- `client` - Synchronous test client
- `async_client` - Asynchronous test client

### WebSocket Fixtures
- `websocket_manager` - Clean WebSocket manager
- `mock_websocket` - Mock WebSocket connection
- `connected_websocket` - Connected WebSocket for testing

### RADIUS Fixtures
- `mock_radius_server` - Mock RADIUS server
- `radius_generator` - RADIUS generator instance

## Writing New Tests

### Unit Test Example

```python
import pytest
from unittest.mock import Mock

@pytest.mark.unit
def test_my_function():
    """Test my function with mocked dependencies"""
    # Arrange
    mock_dependency = Mock()
    mock_dependency.method.return_value = "expected"
    
    # Act
    result = my_function(mock_dependency)
    
    # Assert
    assert result == "expected"
    mock_dependency.method.assert_called_once()
```

### Integration Test Example

```python
import pytest

@pytest.mark.integration
async def test_api_endpoint(async_client, db_session):
    """Test API endpoint with database"""
    # Arrange
    test_data = {"name": "Test"}
    
    # Act
    response = await async_client.post("/api/test", json=test_data)
    
    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Test"
```

### E2E Test Example

```python
import pytest

@pytest.mark.e2e
@pytest.mark.slow
async def test_complete_workflow(async_client):
    """Test complete user workflow"""
    # Create resource
    create_response = await async_client.post("/api/resource", json={...})
    resource_id = create_response.json()["id"]
    
    # Use resource
    use_response = await async_client.post(f"/api/resource/{resource_id}/action")
    assert use_response.status_code == 200
    
    # Verify final state
    final_response = await async_client.get(f"/api/resource/{resource_id}")
    assert final_response.json()["status"] == "completed"
```

## Test Configuration

### Pytest Configuration (`pytest.ini`)

The pytest configuration includes:
- Test discovery patterns
- Coverage settings
- Marker definitions
- Timeout settings
- Warning filters

### Environment Variables

Tests use isolated settings:
- `DATABASE_URL` - In-memory SQLite for tests
- `REDIS_URL` - Test Redis database
- `DEBUG` - Enabled for tests
- `WS_MAX_CONNECTIONS` - Limited for tests

## Continuous Integration

The test suite is designed for CI/CD integration:

```bash
# CI test command
python run_tests.py --coverage --fast
```

For full CI pipeline:
```bash
# Run all tests with coverage
python run_tests.py --coverage

# Generate coverage badge
coverage-badge -o coverage.svg
```

## Best Practices

1. **Test Isolation** - Each test should be independent
2. **Clear Names** - Test names should describe what is being tested
3. **AAA Pattern** - Arrange, Act, Assert structure
4. **Mock External Dependencies** - Use mocks for external services
5. **Test Edge Cases** - Include error conditions and boundary cases
6. **Performance Awareness** - Mark slow tests appropriately
7. **Documentation** - Include docstrings explaining test purpose

## Troubleshooting

### Common Issues

**Import Errors:**
```bash
# Ensure src is in Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
```

**Database Errors:**
- Tests use in-memory SQLite by default
- Check that async database dependencies are installed

**WebSocket Errors:**
- Mock WebSocket connections are used in unit tests
- Real WebSocket tests require proper async handling

**Timeout Issues:**
- Use `@pytest.mark.slow` for tests > 1 second
- Increase timeout in pytest.ini if needed

### Debug Mode

Run tests with verbose output and no capture:
```bash
pytest -v -s tests/unit/test_radius_generator.py::test_packet_creation
```

### Coverage Issues

View detailed coverage report:
```bash
pytest --cov=src --cov-report=term-missing --cov-report=html
open htmlcov/index.html
```

## Contributing

When adding new tests:

1. Place in appropriate directory (`unit/`, `integration/`, `e2e/`)
2. Use appropriate markers (`@pytest.mark.unit`, etc.)
3. Follow naming conventions (`test_*.py`, `test_*()`)
4. Add fixtures to `conftest.py` if reusable
5. Update this README if adding new test categories

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [Coverage.py](https://coverage.readthedocs.io/)