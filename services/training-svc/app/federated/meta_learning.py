"""
Federated Meta-Learning Models

Implements:
- FederatedMAML: Model-Agnostic Meta-Learning for few-shot tenant adaptation
- PerFedAvg: Personalized Federated Averaging
- TenantAdaptation: Rapid adaptation to new tenants/districts

These algorithms enable models to quickly adapt to new tenants
with minimal data, critical for educational deployments.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
import logging
import copy

logger = logging.getLogger(__name__)

# Try to import PyTorch
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    logger.warning("PyTorch not available - using NumPy-only implementations")


@dataclass
class TaskData:
    """Data for a single meta-learning task (tenant/district)"""
    task_id: str
    support_x: np.ndarray  # Training examples
    support_y: np.ndarray  # Training labels
    query_x: np.ndarray    # Test examples
    query_y: np.ndarray    # Test labels
    metadata: Dict = field(default_factory=dict)


@dataclass
class AdaptationResult:
    """Result from model adaptation"""
    task_id: str
    pre_adaptation_loss: float
    post_adaptation_loss: float
    improvement: float
    num_steps: int
    final_accuracy: Optional[float] = None
    adaptation_time_ms: float = 0.0


class FederatedMAML:
    """
    Model-Agnostic Meta-Learning for Federated Settings
    
    Learns initialization that can quickly adapt to any tenant.
    Perfect for educational platforms with diverse districts.
    
    Key insight: Instead of learning one model, learn how to learn
    quickly from a few examples.
    
    Algorithm (Per-FedAvg variant):
    1. Server sends global model to selected clients
    2. Each client adapts locally (inner loop, few gradient steps)
    3. Clients send adaptation trajectory to server
    4. Server updates meta-initialization to improve adaptation
    
    Usage:
        maml = FederatedMAML(model, inner_lr=0.01, meta_lr=0.001)
        
        for round in range(num_rounds):
            tasks = sample_tenant_tasks()
            meta_loss = maml.meta_update(tasks)
            
        # Adapt to new tenant
        adapted = maml.adapt(new_tenant_data, num_steps=5)
    """
    
    def __init__(
        self,
        model_fn: Optional[Callable] = None,
        input_dim: int = 128,
        hidden_dim: int = 64,
        output_dim: int = 10,
        inner_lr: float = 0.01,
        meta_lr: float = 0.001,
        inner_steps: int = 5,
        first_order: bool = True,
    ):
        """
        Args:
            model_fn: Function to create model (or None for default)
            input_dim: Input feature dimension
            hidden_dim: Hidden layer dimension
            output_dim: Output dimension (num classes)
            inner_lr: Learning rate for task adaptation
            meta_lr: Learning rate for meta updates
            inner_steps: Number of gradient steps for adaptation
            first_order: Use first-order approximation (faster)
        """
        self.inner_lr = inner_lr
        self.meta_lr = meta_lr
        self.inner_steps = inner_steps
        self.first_order = first_order
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        
        if HAS_TORCH:
            self._init_torch_model(model_fn)
        else:
            self._init_numpy_model()
        
        logger.info(
            f"FederatedMAML initialized: inner_lr={inner_lr}, meta_lr={meta_lr}, "
            f"inner_steps={inner_steps}, first_order={first_order}"
        )
    
    def _init_torch_model(self, model_fn: Optional[Callable]):
        """Initialize PyTorch model"""
        if model_fn is not None:
            self.model = model_fn()
        else:
            # Default: Simple MLP for educational predictions
            self.model = nn.Sequential(
                nn.Linear(self.input_dim, self.hidden_dim),
                nn.ReLU(),
                nn.Linear(self.hidden_dim, self.hidden_dim),
                nn.ReLU(),
                nn.Linear(self.hidden_dim, self.output_dim),
            )
        
        self.meta_optimizer = optim.Adam(self.model.parameters(), lr=self.meta_lr)
        self.loss_fn = nn.CrossEntropyLoss()
    
    def _init_numpy_model(self):
        """Initialize NumPy-based model"""
        # Simple 2-layer MLP weights
        self.weights = {
            'W1': np.random.randn(self.input_dim, self.hidden_dim) * 0.1,
            'b1': np.zeros(self.hidden_dim),
            'W2': np.random.randn(self.hidden_dim, self.hidden_dim) * 0.1,
            'b2': np.zeros(self.hidden_dim),
            'W3': np.random.randn(self.hidden_dim, self.output_dim) * 0.1,
            'b3': np.zeros(self.output_dim),
        }
    
    def _forward_numpy(self, x: np.ndarray, weights: Dict) -> np.ndarray:
        """Forward pass with NumPy"""
        h1 = np.maximum(0, x @ weights['W1'] + weights['b1'])  # ReLU
        h2 = np.maximum(0, h1 @ weights['W2'] + weights['b2'])
        logits = h2 @ weights['W3'] + weights['b3']
        return logits
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        """Numerically stable softmax"""
        exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=-1, keepdims=True)
    
    def _cross_entropy_loss(self, logits: np.ndarray, targets: np.ndarray) -> float:
        """Cross entropy loss"""
        probs = self._softmax(logits)
        n = len(targets)
        return -np.sum(np.log(probs[np.arange(n), targets.astype(int)] + 1e-10)) / n
    
    def _compute_gradients_numpy(
        self,
        x: np.ndarray,
        y: np.ndarray,
        weights: Dict
    ) -> Dict[str, np.ndarray]:
        """Compute gradients manually for NumPy model"""
        # Forward pass with intermediate activations
        z1 = x @ weights['W1'] + weights['b1']
        h1 = np.maximum(0, z1)
        z2 = h1 @ weights['W2'] + weights['b2']
        h2 = np.maximum(0, z2)
        logits = h2 @ weights['W3'] + weights['b3']
        
        # Softmax and loss gradient
        probs = self._softmax(logits)
        n = len(y)
        d_logits = probs.copy()
        d_logits[np.arange(n), y.astype(int)] -= 1
        d_logits /= n
        
        # Backprop through layers
        grads = {}
        
        # Layer 3
        grads['W3'] = h2.T @ d_logits
        grads['b3'] = np.sum(d_logits, axis=0)
        
        d_h2 = d_logits @ weights['W3'].T
        d_h2[z2 <= 0] = 0  # ReLU derivative
        
        # Layer 2
        grads['W2'] = h1.T @ d_h2
        grads['b2'] = np.sum(d_h2, axis=0)
        
        d_h1 = d_h2 @ weights['W2'].T
        d_h1[z1 <= 0] = 0
        
        # Layer 1
        grads['W1'] = x.T @ d_h1
        grads['b1'] = np.sum(d_h1, axis=0)
        
        return grads
    
    def adapt(
        self,
        task: TaskData,
        num_steps: Optional[int] = None
    ) -> AdaptationResult:
        """
        Adapt model to a specific task/tenant
        
        Args:
            task: TaskData with support/query sets
            num_steps: Override inner_steps
        
        Returns:
            AdaptationResult with metrics
        """
        import time
        start_time = time.time()
        
        num_steps = num_steps or self.inner_steps
        
        if HAS_TORCH:
            result = self._adapt_torch(task, num_steps)
        else:
            result = self._adapt_numpy(task, num_steps)
        
        result.adaptation_time_ms = (time.time() - start_time) * 1000
        return result
    
    def _adapt_torch(self, task: TaskData, num_steps: int) -> AdaptationResult:
        """Adapt using PyTorch"""
        # Clone model for adaptation
        adapted_model = copy.deepcopy(self.model)
        adapted_model.train()
        
        # Prepare data
        support_x = torch.FloatTensor(task.support_x)
        support_y = torch.LongTensor(task.support_y)
        query_x = torch.FloatTensor(task.query_x)
        query_y = torch.LongTensor(task.query_y)
        
        # Pre-adaptation loss
        with torch.no_grad():
            pre_logits = adapted_model(query_x)
            pre_loss = self.loss_fn(pre_logits, query_y).item()
        
        # Inner loop adaptation
        inner_optimizer = optim.SGD(adapted_model.parameters(), lr=self.inner_lr)
        
        for step in range(num_steps):
            inner_optimizer.zero_grad()
            logits = adapted_model(support_x)
            loss = self.loss_fn(logits, support_y)
            loss.backward()
            inner_optimizer.step()
        
        # Post-adaptation loss
        with torch.no_grad():
            post_logits = adapted_model(query_x)
            post_loss = self.loss_fn(post_logits, query_y).item()
            
            # Accuracy
            preds = post_logits.argmax(dim=1)
            accuracy = (preds == query_y).float().mean().item()
        
        return AdaptationResult(
            task_id=task.task_id,
            pre_adaptation_loss=pre_loss,
            post_adaptation_loss=post_loss,
            improvement=(pre_loss - post_loss) / pre_loss if pre_loss > 0 else 0,
            num_steps=num_steps,
            final_accuracy=accuracy,
        )
    
    def _adapt_numpy(self, task: TaskData, num_steps: int) -> AdaptationResult:
        """Adapt using NumPy"""
        # Copy weights for adaptation
        adapted_weights = {k: v.copy() for k, v in self.weights.items()}
        
        # Pre-adaptation loss
        pre_logits = self._forward_numpy(task.query_x, adapted_weights)
        pre_loss = self._cross_entropy_loss(pre_logits, task.query_y)
        
        # Inner loop adaptation
        for step in range(num_steps):
            grads = self._compute_gradients_numpy(
                task.support_x, task.support_y, adapted_weights
            )
            
            for key in adapted_weights:
                adapted_weights[key] -= self.inner_lr * grads[key]
        
        # Post-adaptation loss
        post_logits = self._forward_numpy(task.query_x, adapted_weights)
        post_loss = self._cross_entropy_loss(post_logits, task.query_y)
        
        # Accuracy
        preds = np.argmax(post_logits, axis=1)
        accuracy = np.mean(preds == task.query_y.astype(int))
        
        return AdaptationResult(
            task_id=task.task_id,
            pre_adaptation_loss=pre_loss,
            post_adaptation_loss=post_loss,
            improvement=(pre_loss - post_loss) / pre_loss if pre_loss > 0 else 0,
            num_steps=num_steps,
            final_accuracy=accuracy,
        )
    
    def meta_update(self, tasks: List[TaskData]) -> float:
        """
        Perform meta-update across tasks
        
        Args:
            tasks: List of TaskData from different tenants
        
        Returns:
            Average meta-loss across tasks
        """
        if HAS_TORCH:
            return self._meta_update_torch(tasks)
        else:
            return self._meta_update_numpy(tasks)
    
    def _meta_update_torch(self, tasks: List[TaskData]) -> float:
        """Meta-update using PyTorch"""
        self.meta_optimizer.zero_grad()
        
        total_loss = 0.0
        
        for task in tasks:
            # Clone model parameters
            adapted_params = {
                name: param.clone() 
                for name, param in self.model.named_parameters()
            }
            
            support_x = torch.FloatTensor(task.support_x)
            support_y = torch.LongTensor(task.support_y)
            query_x = torch.FloatTensor(task.query_x)
            query_y = torch.LongTensor(task.query_y)
            
            # Inner loop
            for step in range(self.inner_steps):
                # Manual forward with adapted params
                logits = self._forward_with_params(support_x, adapted_params)
                loss = self.loss_fn(logits, support_y)
                
                # Compute gradients wrt adapted params
                grads = torch.autograd.grad(
                    loss, 
                    adapted_params.values(),
                    create_graph=not self.first_order
                )
                
                # Update adapted params
                adapted_params = {
                    name: param - self.inner_lr * grad
                    for (name, param), grad in zip(adapted_params.items(), grads)
                }
            
            # Meta loss on query set
            query_logits = self._forward_with_params(query_x, adapted_params)
            meta_loss = self.loss_fn(query_logits, query_y)
            total_loss += meta_loss
        
        # Meta update
        avg_loss = total_loss / len(tasks)
        avg_loss.backward()
        self.meta_optimizer.step()
        
        return avg_loss.item()
    
    def _forward_with_params(
        self,
        x: torch.Tensor,
        params: Dict[str, torch.Tensor]
    ) -> torch.Tensor:
        """Forward pass using explicit parameters (for meta-learning)"""
        param_list = list(params.values())
        
        # Assuming Sequential with Linear, ReLU pattern
        idx = 0
        out = x
        
        for i, layer in enumerate(self.model):
            if isinstance(layer, nn.Linear):
                weight = param_list[idx]
                bias = param_list[idx + 1]
                out = nn.functional.linear(out, weight, bias)
                idx += 2
            elif isinstance(layer, nn.ReLU):
                out = nn.functional.relu(out)
        
        return out
    
    def _meta_update_numpy(self, tasks: List[TaskData]) -> float:
        """Meta-update using NumPy (first-order only)"""
        meta_grads = {k: np.zeros_like(v) for k, v in self.weights.items()}
        total_loss = 0.0
        
        for task in tasks:
            # Adapt to task
            adapted_weights = {k: v.copy() for k, v in self.weights.items()}
            
            for step in range(self.inner_steps):
                grads = self._compute_gradients_numpy(
                    task.support_x, task.support_y, adapted_weights
                )
                for key in adapted_weights:
                    adapted_weights[key] -= self.inner_lr * grads[key]
            
            # Compute meta gradient (query loss grad wrt initial weights)
            query_grads = self._compute_gradients_numpy(
                task.query_x, task.query_y, adapted_weights
            )
            
            # Accumulate (first-order approximation)
            for key in meta_grads:
                meta_grads[key] += query_grads[key]
            
            # Track loss
            logits = self._forward_numpy(task.query_x, adapted_weights)
            total_loss += self._cross_entropy_loss(logits, task.query_y)
        
        # Average and apply meta update
        for key in self.weights:
            self.weights[key] -= self.meta_lr * meta_grads[key] / len(tasks)
        
        return total_loss / len(tasks)
    
    def get_model_state(self) -> Dict[str, Any]:
        """Get current model state for federated aggregation"""
        if HAS_TORCH:
            return {
                name: param.detach().cpu().numpy()
                for name, param in self.model.named_parameters()
            }
        else:
            return {k: v.copy() for k, v in self.weights.items()}
    
    def load_model_state(self, state: Dict[str, Any]):
        """Load model state (from federated aggregation)"""
        if HAS_TORCH:
            with torch.no_grad():
                for name, param in self.model.named_parameters():
                    param.copy_(torch.from_numpy(state[name]))
        else:
            self.weights = {k: v.copy() for k, v in state.items()}


class PerFedAvg:
    """
    Personalized Federated Averaging
    
    Combines FedAvg with local personalization.
    Each tenant maintains a personalized model head.
    
    Architecture:
    - Shared base: Common feature extraction (federated)
    - Personalized head: Tenant-specific classifier (local only)
    
    Usage:
        pfa = PerFedAvg(base_model, head_dim=64, output_dim=10)
        
        # Training round
        for tenant in tenants:
            local_update = pfa.local_training(tenant_data, tenant_id)
            updates.append(local_update)
        
        pfa.aggregate_base(updates)
    """
    
    def __init__(
        self,
        input_dim: int = 128,
        hidden_dim: int = 64,
        output_dim: int = 10,
        personalized_layers: int = 1,
        local_lr: float = 0.01,
        global_lr: float = 0.001,
        local_epochs: int = 5,
    ):
        """
        Args:
            input_dim: Input feature dimension
            hidden_dim: Hidden layer dimension
            output_dim: Number of output classes
            personalized_layers: Number of layers to personalize
            local_lr: Learning rate for local updates
            global_lr: Learning rate for global aggregation
            local_epochs: Epochs per local training round
        """
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.personalized_layers = personalized_layers
        self.local_lr = local_lr
        self.global_lr = global_lr
        self.local_epochs = local_epochs
        
        # Shared base model weights
        self.base_weights = {
            'W1': np.random.randn(input_dim, hidden_dim) * 0.1,
            'b1': np.zeros(hidden_dim),
            'W2': np.random.randn(hidden_dim, hidden_dim) * 0.1,
            'b2': np.zeros(hidden_dim),
        }
        
        # Per-tenant personalized heads
        self.tenant_heads: Dict[str, Dict[str, np.ndarray]] = {}
        
        logger.info(
            f"PerFedAvg initialized: personalized_layers={personalized_layers}, "
            f"local_lr={local_lr}, local_epochs={local_epochs}"
        )
    
    def _get_or_create_head(self, tenant_id: str) -> Dict[str, np.ndarray]:
        """Get or initialize personalized head for tenant"""
        if tenant_id not in self.tenant_heads:
            self.tenant_heads[tenant_id] = {
                'W3': np.random.randn(self.hidden_dim, self.output_dim) * 0.1,
                'b3': np.zeros(self.output_dim),
            }
        return self.tenant_heads[tenant_id]
    
    def _forward(
        self,
        x: np.ndarray,
        base_weights: Dict,
        head_weights: Dict
    ) -> np.ndarray:
        """Forward pass through base + head"""
        # Base layers
        h1 = np.maximum(0, x @ base_weights['W1'] + base_weights['b1'])
        h2 = np.maximum(0, h1 @ base_weights['W2'] + base_weights['b2'])
        
        # Personalized head
        logits = h2 @ head_weights['W3'] + head_weights['b3']
        return logits
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=-1, keepdims=True)
    
    def _compute_loss(self, logits: np.ndarray, targets: np.ndarray) -> float:
        probs = self._softmax(logits)
        n = len(targets)
        return -np.sum(np.log(probs[np.arange(n), targets.astype(int)] + 1e-10)) / n
    
    def _compute_gradients(
        self,
        x: np.ndarray,
        y: np.ndarray,
        base_weights: Dict,
        head_weights: Dict
    ) -> Tuple[Dict, Dict]:
        """Compute gradients for both base and head"""
        # Forward with intermediates
        z1 = x @ base_weights['W1'] + base_weights['b1']
        h1 = np.maximum(0, z1)
        z2 = h1 @ base_weights['W2'] + base_weights['b2']
        h2 = np.maximum(0, z2)
        logits = h2 @ head_weights['W3'] + head_weights['b3']
        
        # Loss gradient
        probs = self._softmax(logits)
        n = len(y)
        d_logits = probs.copy()
        d_logits[np.arange(n), y.astype(int)] -= 1
        d_logits /= n
        
        # Head gradients
        head_grads = {
            'W3': h2.T @ d_logits,
            'b3': np.sum(d_logits, axis=0),
        }
        
        # Backprop through base
        d_h2 = d_logits @ head_weights['W3'].T
        d_h2[z2 <= 0] = 0
        
        base_grads = {
            'W2': h1.T @ d_h2,
            'b2': np.sum(d_h2, axis=0),
        }
        
        d_h1 = d_h2 @ base_weights['W2'].T
        d_h1[z1 <= 0] = 0
        
        base_grads['W1'] = x.T @ d_h1
        base_grads['b1'] = np.sum(d_h1, axis=0)
        
        return base_grads, head_grads
    
    def local_training(
        self,
        x: np.ndarray,
        y: np.ndarray,
        tenant_id: str
    ) -> Dict[str, np.ndarray]:
        """
        Perform local training for a tenant
        
        Args:
            x: Training features
            y: Training labels
            tenant_id: Tenant identifier
        
        Returns:
            Delta for base weights (to aggregate)
        """
        # Get personalized head
        head_weights = self._get_or_create_head(tenant_id)
        
        # Copy base weights for local training
        local_base = {k: v.copy() for k, v in self.base_weights.items()}
        
        # Local training
        for epoch in range(self.local_epochs):
            base_grads, head_grads = self._compute_gradients(
                x, y, local_base, head_weights
            )
            
            # Update base (will be sent for aggregation)
            for key in local_base:
                local_base[key] -= self.local_lr * base_grads[key]
            
            # Update personalized head (stays local)
            for key in head_weights:
                head_weights[key] -= self.local_lr * head_grads[key]
        
        # Compute delta for aggregation
        delta = {
            key: local_base[key] - self.base_weights[key]
            for key in self.base_weights
        }
        
        return delta
    
    def aggregate_base(self, deltas: List[Dict[str, np.ndarray]]):
        """
        Aggregate base model updates from tenants
        
        Args:
            deltas: List of weight deltas from tenants
        """
        if not deltas:
            return
        
        # Average deltas
        avg_delta = {key: np.zeros_like(self.base_weights[key]) for key in self.base_weights}
        
        for delta in deltas:
            for key in avg_delta:
                avg_delta[key] += delta[key]
        
        for key in avg_delta:
            avg_delta[key] /= len(deltas)
        
        # Apply to global base
        for key in self.base_weights:
            self.base_weights[key] += self.global_lr * avg_delta[key]
    
    def predict(self, x: np.ndarray, tenant_id: str) -> np.ndarray:
        """
        Make predictions for a tenant
        
        Args:
            x: Input features
            tenant_id: Tenant identifier
        
        Returns:
            Predicted class probabilities
        """
        head_weights = self._get_or_create_head(tenant_id)
        logits = self._forward(x, self.base_weights, head_weights)
        return self._softmax(logits)
    
    def get_base_state(self) -> Dict[str, np.ndarray]:
        """Get base model state for saving/loading"""
        return {k: v.copy() for k, v in self.base_weights.items()}
    
    def load_base_state(self, state: Dict[str, np.ndarray]):
        """Load base model state"""
        self.base_weights = {k: v.copy() for k, v in state.items()}


class TenantAdaptation:
    """
    Rapid Tenant Adaptation Manager
    
    Manages model adaptation when new tenants/districts join.
    Uses combination of:
    - Similar tenant matching
    - Few-shot adaptation
    - Progressive complexity unlock
    
    Usage:
        adapter = TenantAdaptation(maml_model, pfa_model)
        
        # New tenant joins
        initial_model = adapter.bootstrap_tenant(
            tenant_id="new_district",
            demographic_info={"size": "medium", "type": "urban"},
            initial_data=few_examples
        )
    """
    
    def __init__(
        self,
        maml: Optional[FederatedMAML] = None,
        pfa: Optional[PerFedAvg] = None,
    ):
        """
        Args:
            maml: FederatedMAML model for few-shot adaptation
            pfa: PerFedAvg model for personalization
        """
        self.maml = maml
        self.pfa = pfa
        
        # Tenant profiles for similarity matching
        self.tenant_profiles: Dict[str, Dict[str, Any]] = {}
        
        # Adaptation history
        self.adaptation_history: List[Dict[str, Any]] = []
        
        logger.info("TenantAdaptation manager initialized")
    
    def register_tenant(
        self,
        tenant_id: str,
        profile: Dict[str, Any]
    ):
        """
        Register a tenant's profile
        
        Args:
            tenant_id: Unique tenant identifier
            profile: Demographic/configuration info
        """
        self.tenant_profiles[tenant_id] = {
            "profile": profile,
            "registered_at": datetime.utcnow().isoformat(),
            "adaptations": 0,
        }
        logger.info(f"Registered tenant: {tenant_id}")
    
    def find_similar_tenants(
        self,
        target_profile: Dict[str, Any],
        top_k: int = 3
    ) -> List[Tuple[str, float]]:
        """
        Find most similar existing tenants
        
        Args:
            target_profile: Profile to match
            top_k: Number of similar tenants to return
        
        Returns:
            List of (tenant_id, similarity_score) tuples
        """
        similarities = []
        
        for tenant_id, info in self.tenant_profiles.items():
            score = self._compute_profile_similarity(
                target_profile, info["profile"]
            )
            similarities.append((tenant_id, score))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def _compute_profile_similarity(
        self,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> float:
        """Compute similarity between two profiles"""
        score = 0.0
        total_fields = 0
        
        for key in profile1:
            if key in profile2:
                total_fields += 1
                if profile1[key] == profile2[key]:
                    score += 1.0
                elif isinstance(profile1[key], (int, float)) and isinstance(profile2[key], (int, float)):
                    # Numerical similarity
                    max_val = max(abs(profile1[key]), abs(profile2[key]), 1)
                    score += 1 - abs(profile1[key] - profile2[key]) / max_val
        
        return score / max(total_fields, 1)
    
    def bootstrap_tenant(
        self,
        tenant_id: str,
        profile: Dict[str, Any],
        initial_data: Optional[TaskData] = None,
        adaptation_strategy: str = "maml"
    ) -> Dict[str, Any]:
        """
        Bootstrap a new tenant with minimal data
        
        Args:
            tenant_id: New tenant identifier
            profile: Tenant profile/demographics
            initial_data: Optional few-shot data
            adaptation_strategy: "maml", "pfa", or "transfer"
        
        Returns:
            Adapted model state for the tenant
        """
        # Register tenant
        self.register_tenant(tenant_id, profile)
        
        # Find similar tenants for initialization
        similar = self.find_similar_tenants(profile)
        
        result = {
            "tenant_id": tenant_id,
            "strategy": adaptation_strategy,
            "similar_tenants": similar,
            "model_state": None,
            "metrics": {},
        }
        
        if adaptation_strategy == "maml" and self.maml is not None:
            if initial_data is not None:
                # Few-shot adaptation
                adaptation_result = self.maml.adapt(initial_data)
                result["metrics"]["adaptation"] = {
                    "pre_loss": adaptation_result.pre_adaptation_loss,
                    "post_loss": adaptation_result.post_adaptation_loss,
                    "improvement": adaptation_result.improvement,
                }
            result["model_state"] = self.maml.get_model_state()
            
        elif adaptation_strategy == "pfa" and self.pfa is not None:
            if initial_data is not None:
                # Local personalization
                self.pfa.local_training(
                    initial_data.support_x,
                    initial_data.support_y,
                    tenant_id
                )
            result["model_state"] = {
                "base": self.pfa.get_base_state(),
                "has_head": tenant_id in self.pfa.tenant_heads,
            }
        
        # Record adaptation
        self.adaptation_history.append({
            "tenant_id": tenant_id,
            "timestamp": datetime.utcnow().isoformat(),
            "strategy": adaptation_strategy,
            "similar_tenants": [s[0] for s in similar],
        })
        
        logger.info(
            f"Bootstrapped tenant {tenant_id} using {adaptation_strategy}, "
            f"similar: {[s[0] for s in similar[:2]]}"
        )
        
        return result
    
    def get_adaptation_report(self) -> Dict[str, Any]:
        """Get summary of all adaptations"""
        return {
            "total_tenants": len(self.tenant_profiles),
            "total_adaptations": len(self.adaptation_history),
            "strategies_used": list(set(
                h["strategy"] for h in self.adaptation_history
            )),
            "recent_adaptations": self.adaptation_history[-10:],
        }
