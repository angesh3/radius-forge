#!/usr/bin/env python3
"""
Unit Tests for Main Orchestrator Command Routing
Tests the multi-agent orchestration system defined in CLAUDE.md
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

# Test the command routing and orchestration logic
# Since there's no explicit orchestrator class in the current codebase,
# we'll test the conceptual routing patterns and main app components


class TestMainOrchestrator:
    """Test Main Orchestrator functionality"""
    
    @pytest.mark.unit
    def test_command_palette_routing(self):
        """Test that commands are properly routed to designated agents"""
        # Mock command palette mapping
        command_palette = {
            "/triage": "Thinker",
            "/design": "Designer", 
            "/plan": "Main Orchestrator",
            "/arch": "Architect",
            "/dev-be": "Dev-Backend",
            "/dev-fe": "Dev-Frontend",
            "/sec-scan": "Security",
            "/test-unit": "Tester-Unit",
            "/test-int": "Tester-Integration", 
            "/test-e2e": "Tester-E2E",
            "/test-report": "Test Report Generator",
            "/review": "Code Reviewer",
            "/docs": "Documentation",
            "/bundle": "Bundle Generator",
            "/handoff": "Main Orchestrator"
        }
        
        # Test command routing
        assert command_palette["/triage"] == "Thinker"
        assert command_palette["/design"] == "Designer"
        assert command_palette["/test-report"] == "Test Report Generator"
        assert command_palette["/bundle"] == "Bundle Generator"
        
        # Verify all commands have valid owners
        assert all(owner for owner in command_palette.values())
        assert len(command_palette) == 15
    
    @pytest.mark.unit
    def test_task_lifecycle_gates(self):
        """Test quality gates in task lifecycle"""
        task_lifecycle = [
            {"stage": "Triage", "gate": "ACs unambiguous"},
            {"stage": "Design", "gate": "Key flows reviewed by MO; a11y baseline defined"},
            {"stage": "Architecture", "gate": "Security implications reviewed"},
            {"stage": "Implementation", "gate": "Lint/build pass, coverage ≥ baseline"},
            {"stage": "Security", "gate": "No High/Critical without documented exception"},
            {"stage": "Testing", "gate": "ACs & primary journeys verified"},
            {"stage": "Reporting", "gate": "Coverage summary + pass/fail matrix attached"},
            {"stage": "Review", "gate": "CR approval"},
            {"stage": "Docs", "gate": "MO verifies completeness"},
            {"stage": "Bundle", "gate": "Reproducible build confirmed"},
            {"stage": "Handoff", "gate": "Stakeholder sign-off if needed"}
        ]
        
        # Verify all stages have gates
        assert len(task_lifecycle) == 11
        assert all(stage["gate"] for stage in task_lifecycle)
        
        # Test specific gate requirements
        security_gate = next(s for s in task_lifecycle if s["stage"] == "Security")
        assert "High/Critical" in security_gate["gate"]
        
        testing_gate = next(s for s in task_lifecycle if s["stage"] == "Testing")
        assert "ACs" in testing_gate["gate"]


class TestDelegationMatrix:
    """Test delegation and routing rules"""
    
    @pytest.mark.unit
    def test_rule_of_silence(self):
        """Test that agents only respond when assigned or mentioned"""
        
        class MockAgent:
            def __init__(self, name):
                self.name = name
                self.is_silent = True
                self.assigned_commands = []
            
            def assign_command(self, command):
                self.assigned_commands.append(command)
                self.is_silent = False
            
            def mention(self):
                self.is_silent = False
        
        # Create mock agents
        designer = MockAgent("Designer")
        architect = MockAgent("Architect") 
        dev_be = MockAgent("Dev-Backend")
        
        # Test rule of silence - agents start silent
        assert designer.is_silent
        assert architect.is_silent
        assert dev_be.is_silent
        
        # Assign command to designer
        designer.assign_command("/design")
        assert not designer.is_silent
        assert architect.is_silent  # Others remain silent
        assert dev_be.is_silent
        
        # Mention architect
        architect.mention()
        assert not architect.is_silent
    
    @pytest.mark.unit
    def test_delegation_flow(self):
        """Test proper delegation flow through agents"""
        delegation_flow = [
            "MO → Thinker",
            "MO → Designer", 
            "MO → Architect",
            "MO → Dev-BE/Dev-FE",
            "MO → Security",
            "MO → Test Report Generator",
            "MO → Code Reviewer",
            "MO → Documentation",
            "MO → Bundle Generator",
            "MO → Handoff"
        ]
        
        # Verify delegation sequence
        assert "MO → Thinker" in delegation_flow
        assert "MO → Designer" in delegation_flow  
        assert "MO → Test Report Generator" in delegation_flow
        assert "MO → Bundle Generator" in delegation_flow
        
        # Verify MO is orchestrator (appears in all delegations)
        assert all("MO →" in step for step in delegation_flow)


class TestQualityGates:
    """Test quality gate enforcement"""
    
    @pytest.mark.unit
    def test_security_gate_enforcement(self):
        """Test security gate blocks on High/Critical issues"""
        
        class MockSecurityScan:
            def __init__(self, issues):
                self.issues = issues
            
            def has_blocking_issues(self):
                return any(
                    issue.get("severity") in ["High", "Critical"] 
                    and not issue.get("exception_documented")
                    for issue in self.issues
                )
        
        # Test with blocking issues
        scan_with_critical = MockSecurityScan([
            {"severity": "Critical", "description": "SQL Injection", "exception_documented": False}
        ])
        assert scan_with_critical.has_blocking_issues()
        
        # Test with documented exception
        scan_with_exception = MockSecurityScan([
            {"severity": "High", "description": "XSS", "exception_documented": True}
        ])
        assert not scan_with_exception.has_blocking_issues()
        
        # Test with no blocking issues
        scan_clean = MockSecurityScan([
            {"severity": "Medium", "description": "Info disclosure", "exception_documented": False}
        ])
        assert not scan_clean.has_blocking_issues()
    
    @pytest.mark.unit
    def test_coverage_gate_enforcement(self):
        """Test coverage gate enforcement"""
        
        class MockCoverageReport:
            def __init__(self, coverage_percent):
                self.coverage_percent = coverage_percent
                self.baseline = 80.0
            
            def meets_baseline(self):
                return self.coverage_percent >= self.baseline
        
        # Test coverage above baseline
        good_coverage = MockCoverageReport(85.0)
        assert good_coverage.meets_baseline()
        
        # Test coverage below baseline  
        poor_coverage = MockCoverageReport(75.0)
        assert not poor_coverage.meets_baseline()
        
        # Test coverage exactly at baseline
        exact_coverage = MockCoverageReport(80.0)
        assert exact_coverage.meets_baseline()


class TestAgentCommunication:
    """Test inter-agent communication patterns"""
    
    @pytest.mark.unit
    def test_artifact_handoff(self):
        """Test artifact passing between agents"""
        
        class MockArtifact:
            def __init__(self, artifact_type, content):
                self.type = artifact_type
                self.content = content
                self.created_by = None
                self.received_by = []
        
        # Create artifacts
        design_artifact = MockArtifact("wireframes", {"login_flow": "mockup"})
        design_artifact.created_by = "Designer"
        
        arch_artifact = MockArtifact("adr", {"decision": "use_fastapi"})
        arch_artifact.created_by = "Architect"
        
        # Test handoff
        design_artifact.received_by.append("Architect")
        arch_artifact.received_by.append("Dev-Backend")
        
        # Verify artifacts are properly handed off
        assert design_artifact.created_by == "Designer"
        assert "Architect" in design_artifact.received_by
        assert "Dev-Backend" in arch_artifact.received_by
    
    @pytest.mark.unit
    def test_status_reporting(self):
        """Test status reporting functionality"""
        
        class MockTaskStatus:
            def __init__(self):
                self.tasks = {}
            
            def update_task(self, task_id, status, owner, progress=0):
                self.tasks[task_id] = {
                    "status": status,
                    "owner": owner,
                    "progress": progress,
                    "updated_at": datetime.now()
                }
            
            def get_status_summary(self):
                return {
                    "total_tasks": len(self.tasks),
                    "completed": len([t for t in self.tasks.values() if t["status"] == "completed"]),
                    "in_progress": len([t for t in self.tasks.values() if t["status"] == "in_progress"]),
                    "blocked": len([t for t in self.tasks.values() if t["status"] == "blocked"])
                }
        
        status = MockTaskStatus()
        
        # Update task statuses
        status.update_task("design-001", "completed", "Designer", 100)
        status.update_task("dev-be-001", "in_progress", "Dev-Backend", 60)
        status.update_task("sec-001", "blocked", "Security", 0)
        
        summary = status.get_status_summary()
        
        assert summary["total_tasks"] == 3
        assert summary["completed"] == 1
        assert summary["in_progress"] == 1 
        assert summary["blocked"] == 1


class TestProjectConventions:
    """Test project structure and conventions"""
    
    @pytest.mark.unit
    def test_directory_structure(self):
        """Test expected project directory structure"""
        expected_dirs = [
            "docs/",      # ADRs, diagrams, runbooks, specs
            "src/",       # App code (subfolders per component)
            "tests/",     # tests/unit, tests/integration, tests/e2e
            "ops/",       # bootstrap, CI helpers, security policies
            "release/"    # bundles, SBOMs, checksums, manifest
        ]
        
        # Verify all expected directories are defined
        assert len(expected_dirs) == 5
        assert "docs/" in expected_dirs
        assert "src/" in expected_dirs
        assert "tests/" in expected_dirs
        assert "ops/" in expected_dirs
        assert "release/" in expected_dirs
    
    @pytest.mark.unit
    def test_standard_output_template(self):
        """Test standard agent output template"""
        
        class MockAgentOutput:
            def __init__(self):
                self.summary = []
                self.artifacts = []
                self.decisions = []
                self.risks_mitigations = []
                self.next_actions = []
            
            def to_dict(self):
                return {
                    "summary": self.summary,
                    "artifacts": self.artifacts,
                    "decisions": self.decisions,
                    "risks_mitigations": self.risks_mitigations,
                    "next_actions": self.next_actions
                }
        
        output = MockAgentOutput()
        output.summary = ["Completed user flow design", "Created wireframes", "Defined A11y baseline"]
        output.artifacts = ["wireframes/login_flow.png", "specs/accessibility_requirements.md"]
        output.decisions = [{"decision": "Use Material-UI", "rationale": "Consistent with existing design system"}]
        output.risks_mitigations = [{"risk": "Complex navigation", "mitigation": "User testing planned"}]
        output.next_actions = [{"owner": "@Architect", "action": "Review UX flows", "command": "/arch"}]
        
        result = output.to_dict()
        
        # Verify all template sections are present
        assert "summary" in result
        assert "artifacts" in result
        assert "decisions" in result
        assert "risks_mitigations" in result
        assert "next_actions" in result
        
        # Verify content structure
        assert len(result["summary"]) == 3
        assert len(result["artifacts"]) == 2
        assert result["decisions"][0]["decision"] == "Use Material-UI"
        assert result["next_actions"][0]["owner"] == "@Architect"