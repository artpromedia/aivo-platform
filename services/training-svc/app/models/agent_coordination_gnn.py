"""
GNN-based Multi-Agent Coordination

Uses Graph Neural Networks to model agent interactions
and optimize collaboration strategies for educational agents.

Key capabilities:
- Model agent interactions as a graph
- Optimize agent-task assignments
- Coordinate multiple specialist agents
- Learn communication patterns
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Lazy import for torch_geometric (optional dependency)
_torch_geometric_available = None
GCNConv = None
GATConv = None
MessagePassing = None


def _check_torch_geometric():
    """Check if torch_geometric is available"""
    global _torch_geometric_available, GCNConv, GATConv, MessagePassing
    if _torch_geometric_available is None:
        try:
            from torch_geometric.nn import GCNConv as _GCNConv, GATConv as _GATConv, MessagePassing as _MessagePassing
            GCNConv = _GCNConv
            GATConv = _GATConv
            MessagePassing = _MessagePassing
            _torch_geometric_available = True
        except ImportError:
            _torch_geometric_available = False
            logger.warning("torch_geometric not available, using simplified GNN")
    return _torch_geometric_available


class SimpleGraphConv(nn.Module):
    """
    Simplified Graph Convolution layer (fallback when torch_geometric unavailable)
    
    Implements basic message passing: h' = σ(AXW)
    """
    
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.linear = nn.Linear(in_channels, out_channels)
    
    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor
    ) -> torch.Tensor:
        """
        Args:
            x: Node features [num_nodes, in_channels]
            edge_index: Edge indices [2, num_edges]
        
        Returns:
            Updated features [num_nodes, out_channels]
        """
        num_nodes = x.size(0)
        
        # Build adjacency matrix
        adj = torch.zeros(num_nodes, num_nodes, device=x.device)
        if edge_index.size(1) > 0:
            adj[edge_index[0], edge_index[1]] = 1
        
        # Add self-loops
        adj = adj + torch.eye(num_nodes, device=x.device)
        
        # Normalize
        degree = adj.sum(dim=1, keepdim=True).clamp(min=1)
        adj_norm = adj / degree
        
        # Message passing
        out = torch.matmul(adj_norm, x)
        out = self.linear(out)
        
        return out


class SimpleGATConv(nn.Module):
    """
    Simplified Graph Attention layer (fallback)
    """
    
    def __init__(self, in_channels: int, out_channels: int, heads: int = 4):
        super().__init__()
        self.heads = heads
        self.out_channels = out_channels
        
        self.W = nn.Linear(in_channels, heads * out_channels, bias=False)
        self.attention = nn.Linear(2 * out_channels, 1, bias=False)
        self.leaky_relu = nn.LeakyReLU(0.2)
    
    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor
    ) -> torch.Tensor:
        num_nodes = x.size(0)
        
        # Linear transformation
        h = self.W(x).view(num_nodes, self.heads, self.out_channels)
        
        # Compute attention scores
        if edge_index.size(1) > 0:
            src, dst = edge_index[0], edge_index[1]
            
            # Concatenate source and destination features
            h_src = h[src]
            h_dst = h[dst]
            
            # Attention scores
            attn_input = torch.cat([h_src, h_dst], dim=-1)
            attn_scores = self.leaky_relu(self.attention(attn_input))
            attn_scores = F.softmax(attn_scores, dim=0)
            
            # Aggregate
            out = torch.zeros(num_nodes, self.heads, self.out_channels, device=x.device)
            for i in range(edge_index.size(1)):
                out[dst[i]] += attn_scores[i] * h_src[i]
        else:
            out = h
        
        # Mean over heads
        out = out.mean(dim=1)
        
        return out


@dataclass
class AgentCapability:
    """Defines what an agent can do"""
    agent_type: str
    capabilities: List[str]
    max_concurrent_tasks: int = 3
    specialization_score: Dict[str, float] = field(default_factory=dict)
    current_load: int = 0


@dataclass
class AgentAssignment:
    """Assignment of agents to a task"""
    task_id: str
    primary_agent: str
    support_agents: List[str]
    confidence: float
    reasoning: str


class AgentInteractionGraph(nn.Module):
    """
    Models agent interactions as a graph
    
    Nodes = Agents (with capabilities/state)
    Edges = Communication channels (with latency/cost)
    
    Uses GNN to learn optimal agent assignments and coordination patterns.
    """
    
    def __init__(
        self,
        num_agent_types: int = 10,
        hidden_dim: int = 128,
        num_layers: int = 3,
        num_heads: int = 4,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Agent type embedding
        self.agent_embedding = nn.Embedding(num_agent_types, hidden_dim)
        
        # State encoder
        self.state_encoder = nn.Sequential(
            nn.Linear(32, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, hidden_dim)
        )
        
        # Check if torch_geometric is available
        has_pyg = _check_torch_geometric()
        
        # GNN layers for message passing
        if has_pyg and GCNConv is not None:
            self.gnn_layers = nn.ModuleList([
                GCNConv(hidden_dim, hidden_dim)
                for _ in range(num_layers)
            ])
            self.attention = GATConv(hidden_dim, hidden_dim, heads=num_heads, concat=False)
        else:
            self.gnn_layers = nn.ModuleList([
                SimpleGraphConv(hidden_dim, hidden_dim)
                for _ in range(num_layers)
            ])
            self.attention = SimpleGATConv(hidden_dim, hidden_dim, heads=num_heads)
        
        # Task context integration
        self.task_projection = nn.Linear(hidden_dim, hidden_dim)
        
        # Output: agent-task assignment scores
        self.assignment_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 1)
        )
        
        # Collaboration score prediction
        self.collaboration_head = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(
        self,
        agent_types: torch.Tensor,      # [num_agents]
        agent_states: torch.Tensor,      # [num_agents, state_dim]
        edge_index: torch.Tensor,        # [2, num_edges]
        task_embedding: torch.Tensor     # [task_dim]
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Compute optimal agent assignments and collaboration scores
        
        Returns:
            assignment_scores: [num_agents]
            collaboration_scores: [num_agents, num_agents] (pairwise)
        """
        num_agents = agent_types.size(0)
        
        # Embed agent types
        x = self.agent_embedding(agent_types)
        
        # Encode agent states
        state_encoding = self.state_encoder(agent_states)
        x = x + state_encoding
        
        # Message passing through GNN
        for layer in self.gnn_layers:
            x = F.relu(layer(x, edge_index))
            x = F.dropout(x, p=0.1, training=self.training)
        
        # Attention-based aggregation
        x = self.attention(x, edge_index)
        
        # Project task embedding
        task_context = self.task_projection(task_embedding).unsqueeze(0).expand(num_agents, -1)
        
        # Compute assignment scores
        combined = torch.cat([x, task_context], dim=-1)
        assignment_scores = self.assignment_head(combined).squeeze(-1)
        
        # Compute pairwise collaboration scores
        x_i = x.unsqueeze(1).expand(-1, num_agents, -1)
        x_j = x.unsqueeze(0).expand(num_agents, -1, -1)
        pairwise = torch.cat([x_i, x_j], dim=-1)
        collaboration_scores = self.collaboration_head(pairwise).squeeze(-1)
        
        return assignment_scores, collaboration_scores


class TaskEncoder(nn.Module):
    """
    Encodes task requirements into embeddings
    """
    
    def __init__(
        self,
        vocab_size: int = 10000,
        embedding_dim: int = 128,
        hidden_dim: int = 128
    ):
        super().__init__()
        
        self.word_embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(
            embedding_dim,
            hidden_dim,
            num_layers=2,
            bidirectional=True,
            batch_first=True
        )
        self.output_projection = nn.Linear(hidden_dim * 2, hidden_dim)
        
        # Simple word to index mapping
        self.word_to_idx: Dict[str, int] = {}
        self.next_idx = 1  # 0 reserved for padding
    
    def _tokenize(self, text: str) -> torch.Tensor:
        """Simple tokenization"""
        words = text.lower().split()
        indices = []
        for word in words[:50]:  # Limit sequence length
            if word not in self.word_to_idx:
                self.word_to_idx[word] = self.next_idx
                self.next_idx = min(self.next_idx + 1, 9999)
            indices.append(self.word_to_idx[word])
        return torch.tensor(indices)
    
    def forward(self, task_description: str) -> torch.Tensor:
        """Encode task description into embedding"""
        tokens = self._tokenize(task_description).unsqueeze(0)
        tokens = tokens.to(next(self.parameters()).device)
        
        embedded = self.word_embedding(tokens)
        _, (h_n, _) = self.lstm(embedded)
        
        # Concatenate forward and backward hidden states
        h_combined = torch.cat([h_n[-2], h_n[-1]], dim=-1)
        
        output = self.output_projection(h_combined)
        return output.squeeze(0)


class MultiAgentCoordinator:
    """
    Coordinates multiple specialist agents using GNN
    
    Determines:
    - Which agents should work on a task
    - How agents should collaborate
    - Optimal communication patterns
    
    Usage:
        coordinator = MultiAgentCoordinator()
        assignment = coordinator.coordinate(
            task="Explain fractions with visual aids",
            available_agents=["tutor", "content_selector", "emotional_support"],
            context={"learner_anxiety": 0.3, "difficulty": "medium"}
        )
    """
    
    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        self.coordination_model = AgentInteractionGraph().to(self.device)
        self.task_encoder = TaskEncoder().to(self.device)
        
        # Define agent capabilities
        self.agent_capabilities = self._init_capabilities()
        
        # Agent type to index mapping
        self.agent_type_to_idx = {
            agent_type: idx 
            for idx, agent_type in enumerate(self.agent_capabilities.keys())
        }
        
        # Compatibility matrix (learned or predefined)
        self.compatibility_scores = self._init_compatibility()
        
        # Statistics
        self.coordination_history: List[Dict] = []
    
    def _init_capabilities(self) -> Dict[str, AgentCapability]:
        """Define what each agent can do"""
        return {
            "tutor": AgentCapability(
                agent_type="tutor",
                capabilities=["explain", "scaffold", "question", "demonstrate", "feedback"],
                max_concurrent_tasks=5,
                specialization_score={"instruction": 0.9, "assessment": 0.6, "support": 0.5}
            ),
            "goal_planner": AgentCapability(
                agent_type="goal_planner",
                capabilities=["plan", "track_progress", "adjust_goals", "milestone", "schedule"],
                max_concurrent_tasks=10,
                specialization_score={"planning": 0.95, "tracking": 0.85, "instruction": 0.3}
            ),
            "focus_monitor": AgentCapability(
                agent_type="focus_monitor",
                capabilities=["detect_distraction", "intervene", "suggest_break", "timer", "attention_cue"],
                max_concurrent_tasks=20,
                specialization_score={"monitoring": 0.9, "intervention": 0.7, "support": 0.6}
            ),
            "emotional_support": AgentCapability(
                agent_type="emotional_support",
                capabilities=["detect_emotion", "provide_encouragement", "suggest_coping", "celebrate", "comfort"],
                max_concurrent_tasks=10,
                specialization_score={"support": 0.95, "monitoring": 0.7, "instruction": 0.3}
            ),
            "assessment": AgentCapability(
                agent_type="assessment",
                capabilities=["generate_question", "grade", "analyze_mastery", "diagnostic", "feedback"],
                max_concurrent_tasks=8,
                specialization_score={"assessment": 0.95, "instruction": 0.5, "planning": 0.4}
            ),
            "content_selector": AgentCapability(
                agent_type="content_selector",
                capabilities=["recommend", "sequence", "adapt_difficulty", "personalize", "curate"],
                max_concurrent_tasks=15,
                specialization_score={"content": 0.9, "planning": 0.7, "instruction": 0.4}
            ),
            "writing_assistant": AgentCapability(
                agent_type="writing_assistant",
                capabilities=["review", "suggest", "teach_writing", "grammar", "structure"],
                max_concurrent_tasks=5,
                specialization_score={"writing": 0.95, "instruction": 0.7, "feedback": 0.8}
            ),
            "social_story": AgentCapability(
                agent_type="social_story",
                capabilities=["create_story", "personalize", "adapt_autism", "visual_schedule", "social_skill"],
                max_concurrent_tasks=5,
                specialization_score={"special_ed": 0.95, "support": 0.8, "content": 0.6}
            ),
            "speech_language": AgentCapability(
                agent_type="speech_language",
                capabilities=["articulation", "fluency", "language_modeling", "pronunciation", "phonemic_awareness"],
                max_concurrent_tasks=3,
                specialization_score={"speech": 0.95, "assessment": 0.7, "instruction": 0.6}
            ),
            "math_specialist": AgentCapability(
                agent_type="math_specialist",
                capabilities=["math_instruction", "problem_solving", "visual_math", "manipulatives", "math_games"],
                max_concurrent_tasks=5,
                specialization_score={"math": 0.95, "instruction": 0.8, "assessment": 0.7}
            ),
        }
    
    def _init_compatibility(self) -> Dict[Tuple[str, str], float]:
        """Initialize agent compatibility scores"""
        # Some agents work better together
        high_compatibility = [
            ("tutor", "assessment"),
            ("tutor", "content_selector"),
            ("focus_monitor", "emotional_support"),
            ("writing_assistant", "tutor"),
            ("social_story", "emotional_support"),
            ("speech_language", "tutor"),
            ("math_specialist", "tutor"),
            ("goal_planner", "content_selector"),
        ]
        
        scores = {}
        for agent1 in self.agent_capabilities:
            for agent2 in self.agent_capabilities:
                if agent1 == agent2:
                    scores[(agent1, agent2)] = 1.0
                elif (agent1, agent2) in high_compatibility or (agent2, agent1) in high_compatibility:
                    scores[(agent1, agent2)] = 0.9
                else:
                    scores[(agent1, agent2)] = 0.6
        
        return scores
    
    def coordinate(
        self,
        task: str,
        available_agents: List[str],
        context: Optional[Dict] = None
    ) -> AgentAssignment:
        """
        Determine which agents should collaborate on a task
        
        Args:
            task: Task description
            available_agents: List of available agent types
            context: Additional context (learner state, difficulty, etc.)
        
        Returns:
            AgentAssignment with primary and support agents
        """
        if not available_agents:
            raise ValueError("No agents available")
        
        context = context or {}
        
        # Build agent graph
        agent_types = torch.tensor([
            self.agent_type_to_idx.get(agent, 0)
            for agent in available_agents
        ]).to(self.device)
        
        # Compute agent states (load, availability, etc.)
        agent_states = self._compute_agent_states(available_agents, context)
        
        # Build communication graph
        edge_index = self._build_communication_graph(available_agents)
        
        # Encode task requirements
        task_embedding = self.task_encoder(task)
        
        # Run GNN coordination model
        self.coordination_model.eval()
        with torch.no_grad():
            assignment_scores, collaboration_scores = self.coordination_model(
                agent_types,
                agent_states,
                edge_index,
                task_embedding
            )
        
        # Select primary agent
        primary_idx = torch.argmax(assignment_scores).item()
        primary_agent = available_agents[primary_idx]
        
        # Select support agents based on collaboration scores
        support_agents = self._select_support_agents(
            available_agents,
            primary_idx,
            collaboration_scores,
            context
        )
        
        # Compute confidence
        confidence = torch.sigmoid(assignment_scores[primary_idx]).item()
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            task, primary_agent, support_agents, context
        )
        
        assignment = AgentAssignment(
            task_id=f"task_{datetime.utcnow().timestamp():.0f}",
            primary_agent=primary_agent,
            support_agents=support_agents,
            confidence=confidence,
            reasoning=reasoning
        )
        
        # Track history
        self.coordination_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "task": task,
            "assignment": assignment,
        })
        
        return assignment
    
    def _compute_agent_states(
        self,
        agents: List[str],
        context: Dict
    ) -> torch.Tensor:
        """Compute state vector for each agent"""
        states = []
        
        for agent in agents:
            capability = self.agent_capabilities.get(agent)
            if capability:
                # State features: [load_ratio, capability_match, context_relevance, ...]
                load_ratio = capability.current_load / capability.max_concurrent_tasks
                
                # Check if agent capabilities match task needs
                task_keywords = context.get('task_keywords', [])
                capability_match = len(set(capability.capabilities) & set(task_keywords)) / max(1, len(task_keywords))
                
                # Context relevance
                learner_anxiety = context.get('learner_anxiety', 0)
                is_support_agent = agent in ['emotional_support', 'focus_monitor']
                context_relevance = learner_anxiety if is_support_agent else (1 - learner_anxiety * 0.3)
                
                state = [
                    load_ratio,
                    capability_match,
                    context_relevance,
                    capability.specialization_score.get('instruction', 0),
                    capability.specialization_score.get('assessment', 0),
                    capability.specialization_score.get('support', 0),
                ] + [0] * 26  # Pad to 32 dimensions
            else:
                state = [0.5] * 32
            
            states.append(state[:32])
        
        return torch.tensor(states, dtype=torch.float32).to(self.device)
    
    def _build_communication_graph(
        self,
        agents: List[str]
    ) -> torch.Tensor:
        """Build edges based on agent compatibility"""
        edges = []
        
        for i, agent1 in enumerate(agents):
            for j, agent2 in enumerate(agents):
                if i != j:
                    compatibility = self.compatibility_scores.get((agent1, agent2), 0.5)
                    if compatibility > 0.5:
                        edges.append([i, j])
        
        if edges:
            return torch.tensor(edges, dtype=torch.long).t().to(self.device)
        else:
            return torch.empty((2, 0), dtype=torch.long).to(self.device)
    
    def _select_support_agents(
        self,
        agents: List[str],
        primary_idx: int,
        collaboration_scores: torch.Tensor,
        context: Dict
    ) -> List[str]:
        """Select support agents based on collaboration potential"""
        support_agents = []
        
        # Get collaboration scores with primary agent
        collab_with_primary = collaboration_scores[primary_idx].cpu().numpy()
        
        # Sort by collaboration score
        sorted_indices = np.argsort(collab_with_primary)[::-1]
        
        for idx in sorted_indices:
            if idx == primary_idx:
                continue
            
            agent = agents[idx]
            
            # Check if this agent adds value
            if collab_with_primary[idx] > 0.6:
                support_agents.append(agent)
            
            # Limit support agents
            if len(support_agents) >= 2:
                break
        
        # Always include emotional support for anxious learners
        if context.get('learner_anxiety', 0) > 0.5:
            if 'emotional_support' in agents and 'emotional_support' not in support_agents:
                support_agents.append('emotional_support')
        
        # Always include focus monitor for attention issues
        if context.get('attention_issues', False):
            if 'focus_monitor' in agents and 'focus_monitor' not in support_agents:
                support_agents.append('focus_monitor')
        
        return support_agents
    
    def _generate_reasoning(
        self,
        task: str,
        primary_agent: str,
        support_agents: List[str],
        context: Dict
    ) -> str:
        """Generate explanation for agent assignment"""
        primary_cap = self.agent_capabilities.get(primary_agent)
        
        reasons = []
        
        # Primary agent reasoning
        if primary_cap:
            top_capability = max(
                primary_cap.specialization_score.items(),
                key=lambda x: x[1]
            )[0]
            reasons.append(
                f"Selected {primary_agent} as primary due to high {top_capability} specialization"
            )
        
        # Support agent reasoning
        for support in support_agents:
            if support == 'emotional_support':
                reasons.append(
                    "Added emotional support agent due to learner anxiety indicators"
                )
            elif support == 'focus_monitor':
                reasons.append(
                    "Added focus monitor due to attention considerations"
                )
            else:
                compatibility = self.compatibility_scores.get(
                    (primary_agent, support), 0.5
                )
                reasons.append(
                    f"Added {support} (compatibility: {compatibility:.2f})"
                )
        
        return " | ".join(reasons)
    
    def update_agent_load(self, agent_type: str, delta: int):
        """Update current load for an agent"""
        if agent_type in self.agent_capabilities:
            self.agent_capabilities[agent_type].current_load = max(
                0,
                self.agent_capabilities[agent_type].current_load + delta
            )
    
    def get_available_agents(self) -> List[str]:
        """Get list of agents with available capacity"""
        return [
            agent_type
            for agent_type, cap in self.agent_capabilities.items()
            if cap.current_load < cap.max_concurrent_tasks
        ]
    
    def get_stats(self) -> Dict:
        """Get coordination statistics"""
        return {
            "total_coordinations": len(self.coordination_history),
            "agent_types": list(self.agent_capabilities.keys()),
            "agent_loads": {
                agent: cap.current_load
                for agent, cap in self.agent_capabilities.items()
            },
            "recent_assignments": [
                {
                    "task": h["task"][:50],
                    "primary": h["assignment"].primary_agent,
                    "support": h["assignment"].support_agents,
                }
                for h in self.coordination_history[-5:]
            ],
        }
