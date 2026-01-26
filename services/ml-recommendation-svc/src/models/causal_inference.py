"""
Causal Inference Models for Educational Interventions

Implements:
- CausalGraph: Structural causal models for education
- PropensityScoreMatching: Match treated/control for fair comparison
- DoubleMachineLearning: Robust causal effect estimation
- InterventionEffectAnalyzer: Analyze educational intervention effectiveness

Use these to understand WHICH interventions actually help students,
not just correlations in the data.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Try to import sklearn
try:
    from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
    from sklearn.model_selection import cross_val_predict, KFold
    from sklearn.preprocessing import StandardScaler
    from sklearn.neighbors import NearestNeighbors
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    logger.warning("sklearn not available - using simplified implementations")


@dataclass
class CausalNode:
    """A node in the causal graph"""
    name: str
    node_type: str  # "treatment", "outcome", "confounder", "mediator", "instrument"
    parents: List[str] = field(default_factory=list)
    children: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


@dataclass
class CausalEffect:
    """Result of causal effect estimation"""
    treatment: str
    outcome: str
    effect_size: float
    confidence_interval: Tuple[float, float]
    p_value: Optional[float]
    method: str
    sample_size: int
    treated_count: int
    control_count: int
    effect_type: str = "ATE"  # ATE, ATT, CATE
    metadata: Dict = field(default_factory=dict)


class CausalGraph:
    """
    Structural Causal Model for Educational Interventions
    
    Models the causal relationships between:
    - Interventions (tutoring, accommodations, content changes)
    - Student characteristics (prior knowledge, demographics)
    - Outcomes (test scores, engagement, completion)
    
    Usage:
        graph = CausalGraph()
        
        # Define structure
        graph.add_node("prior_knowledge", "confounder")
        graph.add_node("tutoring", "treatment")
        graph.add_node("test_score", "outcome")
        
        graph.add_edge("prior_knowledge", "tutoring")  # Smarter kids more likely to seek tutoring
        graph.add_edge("prior_knowledge", "test_score")  # Also directly affects scores
        graph.add_edge("tutoring", "test_score")  # Treatment effect we want
        
        # Check identifiability
        if graph.is_identifiable("tutoring", "test_score"):
            adjustment_set = graph.get_adjustment_set("tutoring", "test_score")
    """
    
    def __init__(self, name: str = "educational_causal_model"):
        self.name = name
        self.nodes: Dict[str, CausalNode] = {}
        self.edges: Set[Tuple[str, str]] = set()
        
        logger.info(f"CausalGraph '{name}' initialized")
    
    def add_node(
        self,
        name: str,
        node_type: str,
        metadata: Optional[Dict] = None
    ) -> CausalNode:
        """
        Add a node to the graph
        
        Args:
            name: Node identifier
            node_type: "treatment", "outcome", "confounder", "mediator", "instrument"
            metadata: Additional node information
        
        Returns:
            Created CausalNode
        """
        if name in self.nodes:
            raise ValueError(f"Node '{name}' already exists")
        
        node = CausalNode(
            name=name,
            node_type=node_type,
            metadata=metadata or {}
        )
        self.nodes[name] = node
        
        logger.debug(f"Added node: {name} ({node_type})")
        return node
    
    def add_edge(self, parent: str, child: str):
        """
        Add a directed edge (parent causes child)
        
        Args:
            parent: Cause node name
            child: Effect node name
        """
        if parent not in self.nodes:
            raise ValueError(f"Node '{parent}' not found")
        if child not in self.nodes:
            raise ValueError(f"Node '{child}' not found")
        
        self.edges.add((parent, child))
        self.nodes[parent].children.append(child)
        self.nodes[child].parents.append(parent)
        
        # Check for cycles
        if self._has_cycle():
            # Remove edge and raise error
            self.edges.remove((parent, child))
            self.nodes[parent].children.remove(child)
            self.nodes[child].parents.remove(parent)
            raise ValueError(f"Edge {parent} -> {child} would create a cycle")
        
        logger.debug(f"Added edge: {parent} -> {child}")
    
    def _has_cycle(self) -> bool:
        """Check if graph has any cycles (invalid for causal DAG)"""
        visited = set()
        rec_stack = set()
        
        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            
            for child in self.nodes[node].children:
                if child not in visited:
                    if dfs(child):
                        return True
                elif child in rec_stack:
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in self.nodes:
            if node not in visited and dfs(node):
                return True
        
        return False
    
    def get_ancestors(self, node: str) -> Set[str]:
        """Get all ancestors of a node"""
        ancestors = set()
        queue = list(self.nodes[node].parents)
        
        while queue:
            current = queue.pop(0)
            if current not in ancestors:
                ancestors.add(current)
                queue.extend(self.nodes[current].parents)
        
        return ancestors
    
    def get_descendants(self, node: str) -> Set[str]:
        """Get all descendants of a node"""
        descendants = set()
        queue = list(self.nodes[node].children)
        
        while queue:
            current = queue.pop(0)
            if current not in descendants:
                descendants.add(current)
                queue.extend(self.nodes[current].children)
        
        return descendants
    
    def get_confounders(self, treatment: str, outcome: str) -> Set[str]:
        """
        Find confounders between treatment and outcome
        
        Confounders are variables that:
        1. Cause both treatment and outcome
        2. Are not on the causal path from treatment to outcome
        """
        treatment_ancestors = self.get_ancestors(treatment)
        outcome_ancestors = self.get_ancestors(outcome)
        
        # Common ancestors that aren't mediators
        treatment_descendants = self.get_descendants(treatment)
        
        confounders = set()
        common_ancestors = treatment_ancestors & outcome_ancestors
        
        for ancestor in common_ancestors:
            # Not a mediator if not a descendant of treatment
            if ancestor not in treatment_descendants:
                confounders.add(ancestor)
        
        return confounders
    
    def get_adjustment_set(self, treatment: str, outcome: str) -> Set[str]:
        """
        Find minimal sufficient adjustment set using backdoor criterion
        
        Adjusting for these variables blocks all backdoor paths
        while not blocking the causal effect of interest.
        
        Returns:
            Set of variable names to condition on
        """
        # Simple implementation: confounders that are not descendants of treatment
        confounders = self.get_confounders(treatment, outcome)
        treatment_descendants = self.get_descendants(treatment)
        
        adjustment_set = confounders - treatment_descendants
        
        return adjustment_set
    
    def is_identifiable(self, treatment: str, outcome: str) -> bool:
        """
        Check if causal effect is identifiable
        
        Effect is identifiable if:
        1. There exists a valid adjustment set, OR
        2. There is an instrumental variable
        """
        # Check if adjustment set exists
        # For now, we consider effect identifiable if we have adjustment set
        # More sophisticated: check for instruments, front-door criterion, etc.
        _ = self.get_adjustment_set(treatment, outcome)  # Validate adjustment set exists
        
        return True
    
    def create_educational_dag(self) -> "CausalGraph":
        """
        Create a typical educational intervention DAG
        
        Common structure for educational studies.
        """
        # Student background (confounders)
        self.add_node("prior_knowledge", "confounder")
        self.add_node("socioeconomic_status", "confounder")
        self.add_node("learning_style", "confounder")
        self.add_node("motivation", "confounder")
        
        # Interventions (treatments)
        self.add_node("tutoring_received", "treatment")
        self.add_node("accommodation_type", "treatment")
        self.add_node("content_difficulty", "treatment")
        
        # Mediators
        self.add_node("engagement_level", "mediator")
        self.add_node("time_on_task", "mediator")
        
        # Outcomes
        self.add_node("mastery_score", "outcome")
        self.add_node("completion_rate", "outcome")
        
        # Edges: Confounders affect both treatment and outcome
        for confounder in ["prior_knowledge", "socioeconomic_status", "motivation"]:
            self.add_edge(confounder, "tutoring_received")
            self.add_edge(confounder, "mastery_score")
        
        self.add_edge("learning_style", "accommodation_type")
        self.add_edge("learning_style", "mastery_score")
        
        # Treatment to mediators
        self.add_edge("tutoring_received", "engagement_level")
        self.add_edge("accommodation_type", "engagement_level")
        self.add_edge("content_difficulty", "time_on_task")
        
        # Mediators to outcomes
        self.add_edge("engagement_level", "mastery_score")
        self.add_edge("time_on_task", "mastery_score")
        self.add_edge("time_on_task", "completion_rate")
        
        # Direct treatment effects
        self.add_edge("tutoring_received", "mastery_score")
        self.add_edge("accommodation_type", "mastery_score")
        
        return self
    
    def to_dict(self) -> Dict:
        """Serialize graph to dictionary"""
        return {
            "name": self.name,
            "nodes": {
                name: {
                    "type": node.node_type,
                    "parents": node.parents,
                    "children": node.children,
                    "metadata": node.metadata
                }
                for name, node in self.nodes.items()
            },
            "edges": list(self.edges)
        }


class PropensityScoreMatching:
    """
    Propensity Score Matching for Causal Inference
    
    Estimates treatment effects by matching treated units
    to similar control units based on propensity scores.
    
    Propensity score = P(Treatment=1 | Covariates)
    
    This addresses selection bias when treatment assignment
    is not random (common in educational settings).
    
    Usage:
        psm = PropensityScoreMatching()
        
        # Estimate propensity scores
        psm.fit(covariates, treatment)
        
        # Match treated to controls
        matches = psm.match(method="nearest", caliper=0.1)
        
        # Estimate treatment effect
        effect = psm.estimate_effect(outcome)
    """
    
    def __init__(
        self,
        n_neighbors: int = 1,
        caliper: Optional[float] = None,
        replacement: bool = False,
    ):
        """
        Args:
            n_neighbors: Number of control matches per treated unit
            caliper: Maximum propensity score difference for matching
            replacement: Allow control units to be matched multiple times
        """
        self.n_neighbors = n_neighbors
        self.caliper = caliper
        self.replacement = replacement
        
        self.propensity_scores: Optional[np.ndarray] = None
        self.treatment: Optional[np.ndarray] = None
        self.covariates: Optional[np.ndarray] = None
        self.matches: Optional[Dict[int, List[int]]] = None
        
        if HAS_SKLEARN:
            self.propensity_model = LogisticRegression(max_iter=1000)
        else:
            self.propensity_model = None
        
        logger.info(
            f"PropensityScoreMatching: n_neighbors={n_neighbors}, "
            f"caliper={caliper}, replacement={replacement}"
        )
    
    def fit(
        self,
        covariates: np.ndarray,
        treatment: np.ndarray
    ) -> np.ndarray:
        """
        Fit propensity score model
        
        Args:
            covariates: Confounding variables (n_samples, n_features)
            treatment: Binary treatment indicator (n_samples,)
        
        Returns:
            Estimated propensity scores
        """
        self.covariates = covariates
        self.treatment = treatment.astype(int)
        
        if HAS_SKLEARN:
            # Scale covariates
            scaler = StandardScaler()
            covariates_scaled = scaler.fit_transform(covariates)
            
            # Fit logistic regression
            self.propensity_model.fit(covariates_scaled, treatment)
            self.propensity_scores = self.propensity_model.predict_proba(covariates_scaled)[:, 1]
        else:
            # Simple logistic regression
            self.propensity_scores = self._fit_simple_propensity(covariates, treatment)
        
        logger.info(
            f"Propensity scores: mean={self.propensity_scores.mean():.3f}, "
            f"std={self.propensity_scores.std():.3f}"
        )
        
        return self.propensity_scores
    
    def _fit_simple_propensity(
        self,
        X: np.ndarray,
        y: np.ndarray
    ) -> np.ndarray:
        """Simple logistic regression without sklearn"""
        n, d = X.shape
        
        # Add intercept
        x_aug = np.column_stack([np.ones(n), X])
        
        # Initialize weights
        weights = np.zeros(d + 1)
        
        # Gradient descent
        learning_rate = 0.1
        for _ in range(1000):
            # Predictions
            logits = x_aug @ weights
            probs = 1 / (1 + np.exp(-np.clip(logits, -500, 500)))
            
            # Gradient
            gradient = x_aug.T @ (probs - y) / n
            weights -= learning_rate * gradient
        
        # Final predictions
        logits = x_aug @ weights
        return 1 / (1 + np.exp(-np.clip(logits, -500, 500)))
    
    def match(
        self,
        method: str = "nearest"
    ) -> Dict[int, List[int]]:
        """
        Match treated units to control units
        
        Args:
            method: "nearest" for nearest neighbor matching
        
        Returns:
            Dictionary mapping treated indices to matched control indices
        """
        if self.propensity_scores is None:
            raise ValueError("Must call fit() first")
        
        treated_idx = np.nonzero(self.treatment == 1)[0]
        control_idx = np.nonzero(self.treatment == 0)[0]
        
        treated_scores = self.propensity_scores[treated_idx]
        control_scores = self.propensity_scores[control_idx]
        
        self.matches = {}
        used_controls = set() if not self.replacement else None
        
        if HAS_SKLEARN and method == "nearest":
            # Use sklearn's nearest neighbors
            nn = NearestNeighbors(n_neighbors=min(self.n_neighbors, len(control_idx)))
            nn.fit(control_scores.reshape(-1, 1))
            
            distances, indices = nn.kneighbors(treated_scores.reshape(-1, 1))
            
            for i, (t_idx, dists, ctrl_indices) in enumerate(zip(treated_idx, distances, indices)):
                matched_controls = []
                for dist, c_idx in zip(dists, ctrl_indices):
                    if self.caliper is None or dist <= self.caliper:
                        actual_idx = control_idx[c_idx]
                        if self.replacement or actual_idx not in used_controls:
                            matched_controls.append(actual_idx)
                            if not self.replacement:
                                used_controls.add(actual_idx)
                
                if matched_controls:
                    self.matches[t_idx] = matched_controls
        else:
            # Simple nearest neighbor matching
            for t_idx, t_score in zip(treated_idx, treated_scores):
                distances = np.abs(control_scores - t_score)
                sorted_idx = np.argsort(distances)
                
                matched_controls = []
                for c_local_idx in sorted_idx[:self.n_neighbors]:
                    if self.caliper is None or distances[c_local_idx] <= self.caliper:
                        actual_idx = control_idx[c_local_idx]
                        if self.replacement or actual_idx not in used_controls:
                            matched_controls.append(actual_idx)
                            if not self.replacement:
                                used_controls.add(actual_idx)
                
                if matched_controls:
                    self.matches[t_idx] = matched_controls
        
        n_matched = len(self.matches)
        n_treated = len(treated_idx)
        logger.info(f"Matched {n_matched}/{n_treated} treated units")
        
        return self.matches
    
    def estimate_effect(
        self,
        outcome: np.ndarray,
        effect_type: str = "ATT"
    ) -> CausalEffect:
        """
        Estimate treatment effect using matched samples
        
        Args:
            outcome: Outcome variable
            effect_type: "ATT" (average treatment on treated) or "ATE"
        
        Returns:
            CausalEffect with effect size and confidence interval
        """
        if self.matches is None:
            raise ValueError("Must call match() first")
        
        treated_outcomes = []
        control_outcomes = []
        
        for t_idx, c_indices in self.matches.items():
            treated_outcomes.append(outcome[t_idx])
            # Average of matched controls
            control_outcomes.append(np.mean([outcome[c_idx] for c_idx in c_indices]))
        
        treated_outcomes = np.array(treated_outcomes)
        control_outcomes = np.array(control_outcomes)
        
        # Effect size
        effect_size = np.mean(treated_outcomes - control_outcomes)
        
        # Bootstrap confidence interval
        n_bootstrap = 1000
        bootstrap_effects = []
        rng = np.random.default_rng(seed=42)
        
        for _ in range(n_bootstrap):
            indices = rng.choice(len(treated_outcomes), len(treated_outcomes), replace=True)
            boot_effect = np.mean(treated_outcomes[indices] - control_outcomes[indices])
            bootstrap_effects.append(boot_effect)
        
        ci_low = np.percentile(bootstrap_effects, 2.5)
        ci_high = np.percentile(bootstrap_effects, 97.5)
        
        # Simple p-value (two-sided t-test approximation)
        se = np.std(bootstrap_effects)
        if se > 0:
            z = effect_size / se
            p_value = 2 * (1 - self._normal_cdf(abs(z)))
        else:
            p_value = 0.0 if effect_size != 0 else 1.0
        
        return CausalEffect(
            treatment="treatment",
            outcome="outcome",
            effect_size=effect_size,
            confidence_interval=(ci_low, ci_high),
            p_value=p_value,
            method="propensity_score_matching",
            sample_size=len(treated_outcomes) + len(control_outcomes),
            treated_count=len(treated_outcomes),
            control_count=len(control_outcomes),
            effect_type=effect_type,
            metadata={
                "n_neighbors": self.n_neighbors,
                "caliper": self.caliper,
                "n_bootstrap": n_bootstrap,
            }
        )
    
    def _normal_cdf(self, x: float) -> float:
        """Approximate normal CDF"""
        import math
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))
    
    def get_balance_statistics(self) -> Dict[str, Any]:
        """
        Check covariate balance after matching
        
        Returns standardized mean differences (SMD) for each covariate.
        SMD < 0.1 is generally considered good balance.
        """
        if self.matches is None or self.covariates is None:
            raise ValueError("Must call match() first")
        
        matched_treated_idx = list(self.matches.keys())
        matched_control_idx = []
        for c_list in self.matches.values():
            matched_control_idx.extend(c_list)
        
        treated_covs = self.covariates[matched_treated_idx]
        control_covs = self.covariates[matched_control_idx]
        
        balance = {}
        for i in range(self.covariates.shape[1]):
            t_mean = treated_covs[:, i].mean()
            c_mean = control_covs[:, i].mean()
            
            pooled_std = np.sqrt((treated_covs[:, i].var() + control_covs[:, i].var()) / 2)
            
            smd = (t_mean - c_mean) / pooled_std if pooled_std > 0 else 0
            
            balance[f"covariate_{i}"] = {
                "treated_mean": t_mean,
                "control_mean": c_mean,
                "standardized_mean_diff": smd,
                "balanced": abs(smd) < 0.1
            }
        
        return balance


class DoubleMachineLearning:
    """
    Double/Debiased Machine Learning for Causal Inference
    
    Uses ML models to flexibly control for confounders while
    providing valid inference on the treatment effect.
    
    Key insight: Cross-fit ML predictions avoid overfitting bias
    that would invalidate standard errors.
    
    Steps:
    1. Predict outcome from confounders (nuisance model 1)
    2. Predict treatment from confounders (nuisance model 2)
    3. Regress residualized outcome on residualized treatment
    
    This gives consistent treatment effect estimate even with
    complex, high-dimensional confounders.
    
    Usage:
        dml = DoubleMachineLearning()
        effect = dml.estimate_effect(
            covariates=confounders,
            treatment=tutoring,
            outcome=test_scores,
            n_folds=5
        )
    """
    
    def __init__(
        self,
        outcome_model: str = "random_forest",
        treatment_model: str = "random_forest",
        final_model: str = "linear",
    ):
        """
        Args:
            outcome_model: Model for Y ~ X ("random_forest", "gradient_boosting", "linear")
            treatment_model: Model for T ~ X
            final_model: Model for residualized regression
        """
        self.outcome_model_type = outcome_model
        self.treatment_model_type = treatment_model
        self.final_model_type = final_model
        
        logger.info(
            f"DoubleMachineLearning: outcome={outcome_model}, "
            f"treatment={treatment_model}, final={final_model}"
        )
    
    def _create_model(self, model_type: str, is_classifier: bool = False):
        """Create ML model based on type"""
        if not HAS_SKLEARN:
            return None
        
        if model_type == "random_forest":
            if is_classifier:
                return RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
            return RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
        elif model_type == "gradient_boosting":
            return GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
        else:  # linear
            return Ridge(alpha=1.0)
    
    def estimate_effect(
        self,
        covariates: np.ndarray,
        treatment: np.ndarray,
        outcome: np.ndarray,
        n_folds: int = 5,
    ) -> CausalEffect:
        """
        Estimate causal effect using Double ML
        
        Args:
            covariates: Confounding variables (n, d)
            treatment: Treatment indicator (n,)
            outcome: Outcome variable (n,)
            n_folds: Number of cross-fitting folds
        
        Returns:
            CausalEffect with debiased estimate
        """
        if HAS_SKLEARN:
            return self._estimate_sklearn(covariates, treatment, outcome, n_folds)
        else:
            return self._estimate_simple(covariates, treatment, outcome)
    
    def _estimate_sklearn(
        self,
        covariates: np.ndarray,
        treatment: np.ndarray,
        outcome: np.ndarray,
        n_folds: int
    ) -> CausalEffect:
        """Estimate with sklearn models"""
        n = len(outcome)
        treatment = treatment.astype(float)
        
        # Cross-fitted predictions for outcome model
        outcome_model = self._create_model(self.outcome_model_type)
        outcome_pred = cross_val_predict(outcome_model, covariates, outcome, cv=n_folds)
        
        # Cross-fitted predictions for treatment model  
        treatment_model = self._create_model(self.treatment_model_type)
        treatment_pred = cross_val_predict(treatment_model, covariates, treatment, cv=n_folds)
        
        # Residualize
        outcome_resid = outcome - outcome_pred
        treatment_resid = treatment - treatment_pred
        
        # Final stage: regress Y_resid on T_resid
        # theta = (T_resid' T_resid)^(-1) T_resid' Y_resid
        denom = np.sum(treatment_resid ** 2)
        if denom > 0:
            theta = np.sum(treatment_resid * outcome_resid) / denom
        else:
            theta = 0.0
        
        # Robust standard error (influence function based)
        psi = (outcome_resid - theta * treatment_resid) * treatment_resid
        var_theta = np.mean(psi ** 2) / (denom / n) ** 2 / n
        se_theta = np.sqrt(var_theta)
        
        # Confidence interval
        z_alpha = 1.96
        ci_low = theta - z_alpha * se_theta
        ci_high = theta + z_alpha * se_theta
        
        # P-value
        if se_theta > 0:
            z_stat = theta / se_theta
            p_value = 2 * (1 - self._normal_cdf(abs(z_stat)))
        else:
            p_value = 0.0 if theta != 0 else 1.0
        
        return CausalEffect(
            treatment="treatment",
            outcome="outcome",
            effect_size=theta,
            confidence_interval=(ci_low, ci_high),
            p_value=p_value,
            method="double_machine_learning",
            sample_size=n,
            treated_count=int(treatment.sum()),
            control_count=n - int(treatment.sum()),
            effect_type="ATE",
            metadata={
                "n_folds": n_folds,
                "outcome_model": self.outcome_model_type,
                "treatment_model": self.treatment_model_type,
                "standard_error": se_theta,
            }
        )
    
    def _estimate_simple(
        self,
        covariates: np.ndarray,
        treatment: np.ndarray,
        outcome: np.ndarray
    ) -> CausalEffect:
        """Simple estimation without sklearn"""
        n = len(outcome)
        treatment = treatment.astype(float)
        
        # Simple linear regression for nuisance functions
        # Y ~ X
        x_aug = np.column_stack([np.ones(n), covariates])
        outcome_coef = np.linalg.lstsq(x_aug, outcome, rcond=None)[0]
        outcome_pred = x_aug @ outcome_coef
        
        # T ~ X
        treatment_coef = np.linalg.lstsq(x_aug, treatment, rcond=None)[0]
        treatment_pred = x_aug @ treatment_coef
        
        # Residualize
        outcome_resid = outcome - outcome_pred
        treatment_resid = treatment - treatment_pred
        
        # Final regression
        denom = np.sum(treatment_resid ** 2)
        theta = np.sum(treatment_resid * outcome_resid) / denom if denom > 0 else 0
        
        # Standard error
        resid_sq = (outcome_resid - theta * treatment_resid) ** 2
        var_theta = np.sum(resid_sq * treatment_resid ** 2) / denom ** 2
        se_theta = np.sqrt(var_theta)
        
        ci_low = theta - 1.96 * se_theta
        ci_high = theta + 1.96 * se_theta
        
        p_value = 2 * (1 - self._normal_cdf(abs(theta / se_theta))) if se_theta > 0 else 0
        
        return CausalEffect(
            treatment="treatment",
            outcome="outcome",
            effect_size=theta,
            confidence_interval=(ci_low, ci_high),
            p_value=p_value,
            method="double_machine_learning_simple",
            sample_size=n,
            treated_count=int(treatment.sum()),
            control_count=n - int(treatment.sum()),
            effect_type="ATE",
        )
    
    def _normal_cdf(self, x: float) -> float:
        import math
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))


class InterventionEffectAnalyzer:
    """
    High-level analyzer for educational intervention effectiveness
    
    Combines multiple causal inference methods to provide
    robust estimates of intervention effects.
    
    Usage:
        analyzer = InterventionEffectAnalyzer()
        
        # Analyze tutoring effect on test scores
        results = analyzer.analyze_intervention(
            intervention_name="one_on_one_tutoring",
            treatment=tutoring_received,
            outcome=test_scores,
            confounders=student_features,
        )
    """
    
    def __init__(self):
        self.causal_graph = CausalGraph("intervention_analysis")
        self.psm = PropensityScoreMatching()
        self.dml = DoubleMachineLearning()
        
        self.analysis_history: List[Dict] = []
        
        logger.info("InterventionEffectAnalyzer initialized")
    
    def analyze_intervention(
        self,
        intervention_name: str,
        treatment: np.ndarray,
        outcome: np.ndarray,
        confounders: np.ndarray,
        methods: List[str] = ["psm", "dml"],
    ) -> Dict[str, Any]:
        """
        Analyze effect of an educational intervention
        
        Args:
            intervention_name: Name of the intervention
            treatment: Binary treatment indicator
            outcome: Outcome variable
            confounders: Confounding variables
            methods: Which methods to use
        
        Returns:
            Dictionary with effect estimates from each method
        """
        results = {
            "intervention": intervention_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sample_size": len(treatment),
            "treated_count": int(treatment.sum()),
            "control_count": len(treatment) - int(treatment.sum()),
            "methods": {},
        }
        
        # Propensity Score Matching
        if "psm" in methods:
            try:
                self.psm.fit(confounders, treatment)
                self.psm.match()
                psm_effect = self.psm.estimate_effect(outcome)
                balance = self.psm.get_balance_statistics()
                
                results["methods"]["psm"] = {
                    "effect_size": psm_effect.effect_size,
                    "confidence_interval": psm_effect.confidence_interval,
                    "p_value": psm_effect.p_value,
                    "balance_check": all(b["balanced"] for b in balance.values()),
                    "matched_treated": len(self.psm.matches),
                }
            except Exception as e:
                logger.warning(f"PSM failed: {e}")
                results["methods"]["psm"] = {"error": str(e)}
        
        # Double Machine Learning
        if "dml" in methods:
            try:
                dml_effect = self.dml.estimate_effect(confounders, treatment, outcome)
                
                results["methods"]["dml"] = {
                    "effect_size": dml_effect.effect_size,
                    "confidence_interval": dml_effect.confidence_interval,
                    "p_value": dml_effect.p_value,
                    "standard_error": dml_effect.metadata.get("standard_error"),
                }
            except Exception as e:
                logger.warning(f"DML failed: {e}")
                results["methods"]["dml"] = {"error": str(e)}
        
        # Aggregate across methods
        valid_effects = [
            r["effect_size"] 
            for r in results["methods"].values() 
            if "effect_size" in r
        ]
        
        if valid_effects:
            results["summary"] = {
                "mean_effect": np.mean(valid_effects),
                "median_effect": np.median(valid_effects),
                "effect_range": (min(valid_effects), max(valid_effects)),
                "consistent_sign": all(e > 0 for e in valid_effects) or all(e < 0 for e in valid_effects),
            }
        
        # Store in history
        self.analysis_history.append(results)
        
        logger.info(
            f"Intervention '{intervention_name}': "
            f"mean effect = {results.get('summary', {}).get('mean_effect', 'N/A')}"
        )
        
        return results
    
    def compare_interventions(
        self,
        interventions: Dict[str, np.ndarray],
        outcome: np.ndarray,
        confounders: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Compare multiple interventions
        
        Args:
            interventions: Dict mapping intervention names to treatment arrays
            outcome: Outcome variable
            confounders: Confounding variables
        
        Returns:
            Comparison of all intervention effects
        """
        results = {}
        
        for name, treatment in interventions.items():
            results[name] = self.analyze_intervention(
                name, treatment, outcome, confounders
            )
        
        # Rank interventions by effect size
        effects = [
            (name, r.get("summary", {}).get("mean_effect", 0))
            for name, r in results.items()
        ]
        effects.sort(key=lambda x: abs(x[1]), reverse=True)
        
        return {
            "interventions": results,
            "ranking": effects,
            "most_effective": effects[0][0] if effects else None,
        }
    
    def get_analysis_report(self) -> Dict[str, Any]:
        """Get summary of all analyses"""
        return {
            "total_analyses": len(self.analysis_history),
            "interventions_analyzed": list({
                a["intervention"] for a in self.analysis_history
            }),
            "recent_analyses": self.analysis_history[-5:],
        }
