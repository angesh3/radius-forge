#!/usr/bin/env python3
"""
RadiusForge Main Orchestrator (MO) - Command Router Implementation
Handles routing of commands to appropriate agents based on CLAUDE.md delegation matrix
"""

import os
import sys
import yaml
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path


class DelegationMatrix:
    """Manages command delegation to agents based on CLAUDE.md rules"""
    
    def __init__(self):
        self.agents_dir = Path(__file__).parent / "agents"
        self.agents = {}
        self.delegation_map = {
            "/triage": "thinker",
            "/design": "designer",
            "/arch": "architect",
            "/dev-be": "dev_backend",
            "/dev-fe": "dev_frontend",
            "/sec-scan": "security",
            "/test-unit": "tester_unit",
            "/test-int": "tester_integration",
            "/test-e2e": "tester_e2e",
            "/test-report": "test_report_generator",
            "/review": "code_reviewer",
            "/docs": "documentation",
            "/bundle": "bundle",
            "/plan": "main_orchestrator",
            "/status": "main_orchestrator",
            "/handoff": "main_orchestrator"
        }
        self.load_agents()
    
    def load_agents(self):
        """Load all agent configurations from YAML files"""
        for agent_file in self.agents_dir.glob("*.yaml"):
            with open(agent_file, 'r') as f:
                agent_data = yaml.safe_load(f)
                agent_id = agent_file.stem
                self.agents[agent_id] = agent_data
    
    def get_owner(self, command: str) -> Optional[str]:
        """Get the agent that owns a command"""
        return self.delegation_map.get(command)
    
    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get agent configuration by ID"""
        return self.agents.get(agent_id)


class MainOrchestrator:
    """Main Orchestrator - coordinates all RadiusForge work"""
    
    def __init__(self):
        self.matrix = DelegationMatrix()
        self.active_tasks = []
        self.quality_gates = []
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.silence_rule = True  # Only assigned agents speak
        
    def route_command(self, command: str, args: str = "") -> Dict[str, Any]:
        """Route a command to the appropriate agent"""
        # Extract base command
        base_command = command.split()[0] if command else ""
        
        # Check if it's a valid command
        owner = self.matrix.get_owner(base_command)
        if not owner:
            return {
                "status": "error",
                "message": f"Unknown command: {base_command}",
                "available_commands": list(self.matrix.delegation_map.keys())
            }
        
        # Get agent configuration
        agent = self.matrix.get_agent(owner)
        if not agent:
            return {
                "status": "error",
                "message": f"Agent not found: {owner}"
            }
        
        # Log routing
        routing_info = {
            "session_id": self.session_id,
            "command": base_command,
            "args": args,
            "routed_to": agent['name'],
            "agent_id": owner,
            "timestamp": datetime.now().isoformat()
        }
        
        # If it's an MO command, handle internally
        if owner == "main_orchestrator":
            return self.handle_mo_command(base_command, args, routing_info)
        
        # Otherwise, delegate to agent
        return self.delegate_to_agent(agent, base_command, args, routing_info)
    
    def handle_mo_command(self, command: str, args: str, routing_info: Dict) -> Dict:
        """Handle commands owned by Main Orchestrator"""
        if command == "/plan":
            return self.create_plan(args, routing_info)
        elif command == "/status":
            return self.get_status(routing_info)
        elif command == "/handoff":
            return self.handoff(routing_info)
        else:
            return {
                "status": "error",
                "message": f"MO command not implemented: {command}"
            }
    
    def create_plan(self, args: str, routing_info: Dict) -> Dict:
        """Create execution plan for a task"""
        # Parse the request
        plan_steps = []
        
        # Standard workflow based on task type
        if "feature" in args.lower() or "implement" in args.lower():
            plan_steps = [
                {"step": 1, "command": "/triage", "agent": "Thinker", "purpose": "Clarify requirements and ACs"},
                {"step": 2, "command": "/design", "agent": "Designer", "purpose": "Create UX flows and wireframes"},
                {"step": 3, "command": "/arch", "agent": "Architect", "purpose": "Define technical architecture"},
                {"step": 4, "command": "/dev-be", "agent": "Dev-BE", "purpose": "Implement backend"},
                {"step": 5, "command": "/dev-fe", "agent": "Dev-FE", "purpose": "Implement frontend"},
                {"step": 6, "command": "/sec-scan", "agent": "Security", "purpose": "Security assessment"},
                {"step": 7, "command": "/test-unit", "agent": "Tester-Unit", "purpose": "Unit testing"},
                {"step": 8, "command": "/test-int", "agent": "Tester-Integration", "purpose": "Integration testing"},
                {"step": 9, "command": "/test-e2e", "agent": "Tester-E2E", "purpose": "End-to-end testing"},
                {"step": 10, "command": "/test-report", "agent": "Test Report Generator", "purpose": "Generate test report"},
                {"step": 11, "command": "/review", "agent": "Code Reviewer", "purpose": "Code review"},
                {"step": 12, "command": "/docs", "agent": "Documentation", "purpose": "Update documentation"},
                {"step": 13, "command": "/bundle", "agent": "Bundle", "purpose": "Create deployment bundle"},
                {"step": 14, "command": "/handoff", "agent": "Main Orchestrator", "purpose": "Final delivery"}
            ]
        
        return {
            "status": "success",
            "routing": routing_info,
            "plan": {
                "request": args,
                "steps": plan_steps,
                "estimated_duration": "4-6 hours",
                "quality_gates": self.get_quality_gates()
            }
        }
    
    def get_status(self, routing_info: Dict) -> Dict:
        """Get current status of all active tasks"""
        return {
            "status": "success",
            "routing": routing_info,
            "active_tasks": self.active_tasks,
            "completed_gates": self.quality_gates,
            "session": self.session_id
        }
    
    def handoff(self, routing_info: Dict) -> Dict:
        """Final handoff with all artifacts"""
        artifacts = {
            "test_reports": "release/test-report-*.html",
            "bundle": "release/radiusforge-bundle-*.tar.gz",
            "documentation": "docs/",
            "sbom": "release/sbom.json",
            "checksums": "release/checksums.sha256"
        }
        
        return {
            "status": "success",
            "routing": routing_info,
            "handoff": {
                "session": self.session_id,
                "artifacts": artifacts,
                "quality_gates_passed": len(self.quality_gates),
                "next_steps": [
                    "Deploy to staging environment",
                    "Run smoke tests",
                    "Schedule production deployment"
                ]
            }
        }
    
    def delegate_to_agent(self, agent: Dict, command: str, args: str, routing_info: Dict) -> Dict:
        """Delegate command to specific agent"""
        # Apply Rule of Silence - only this agent responds
        response = {
            "status": "delegated",
            "routing": routing_info,
            "agent_response": {
                "agent": agent['name'],
                "role": agent['role'],
                "command": command,
                "args": args,
                "message": f"Agent {agent['name']} is handling {command}",
                "silence_rule": "Only this agent responds; others remain silent"
            }
        }
        
        # Add to active tasks
        self.active_tasks.append({
            "command": command,
            "agent": agent['name'],
            "started": datetime.now().isoformat(),
            "status": "in_progress"
        })
        
        return response
    
    def get_quality_gates(self) -> List[Dict]:
        """Get list of quality gates from agent configs"""
        gates = []
        mo_agent = self.matrix.get_agent("main_orchestrator")
        if mo_agent and 'quality_gates' in mo_agent:
            gates = mo_agent['quality_gates']
        return gates


def main():
    """CLI entry point for the orchestrator"""
    orchestrator = MainOrchestrator()
    
    if len(sys.argv) < 2:
        print("RadiusForge Main Orchestrator")
        print("Usage: orchestrator.py <command> [args]")
        print("\nAvailable commands:")
        for cmd, owner in orchestrator.matrix.delegation_map.items():
            agent = orchestrator.matrix.get_agent(owner)
            if agent:
                print(f"  {cmd:<15} - {agent['name']}")
        sys.exit(1)
    
    command = sys.argv[1]
    args = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
    
    result = orchestrator.route_command(command, args)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()