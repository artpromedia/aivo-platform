"""
Policy Evaluator

Evaluate RL policy performance.
"""
import logging
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class EvaluationMetrics:
    average_reward: float
    learning_gain: float
    completion_rate: float
    engagement_score: float
    episodes_evaluated: int


@dataclass
class EpisodeResult:
    total_reward: float
    steps: int
    learning_gain: float
    final_engagement: float
    completed: bool


class PolicyEvaluator:
    """
    Evaluate tutoring policy performance.

    Metrics:
    - Average cumulative reward
    - Learning outcomes
    - Student engagement
    - Session completion

    Usage:
        evaluator = PolicyEvaluator()
        metrics = evaluator.evaluate(policy, num_episodes=100)
    """

    def __init__(self):
        self._evaluation_history: List[Dict] = []
        logger.info("PolicyEvaluator initialized")

    def evaluate(
        self,
        policy,
        num_episodes: int = 100,
        max_steps_per_episode: int = 50,
        experience_data: Optional[List[Dict]] = None,
    ) -> EvaluationMetrics:
        """Evaluate policy over multiple episodes."""
        if experience_data:
            # Evaluate using recorded experience data
            return self._evaluate_from_data(policy, experience_data, num_episodes)
        else:
            # Evaluate using simulated episodes
            return self._evaluate_simulated(policy, num_episodes, max_steps_per_episode)

    def _evaluate_from_data(
        self,
        policy,
        experience_data: List[Dict],
        num_episodes: int,
    ) -> EvaluationMetrics:
        """Evaluate policy using recorded experience data."""
        if not experience_data:
            return EvaluationMetrics(
                average_reward=0.0,
                learning_gain=0.0,
                completion_rate=0.0,
                engagement_score=0.0,
                episodes_evaluated=0,
            )

        total_rewards = []
        learning_gains = []
        engagements = []
        completions = []

        # Group experiences by episode/session
        episodes = self._group_by_episode(experience_data)
        episodes_to_eval = list(episodes.values())[:num_episodes]

        for episode_exps in episodes_to_eval:
            episode_reward = sum(exp.get("reward", 0) for exp in episode_exps)
            total_rewards.append(episode_reward)

            # Calculate learning gain from first to last state
            if episode_exps:
                first_state = episode_exps[0].get("state", {})
                last_state = episode_exps[-1].get("next_state", episode_exps[-1].get("state", {}))

                first_knowledge = first_state.get("knowledge_state", {})
                last_knowledge = last_state.get("knowledge_state", {})

                if first_knowledge and last_knowledge:
                    first_avg = np.mean(list(first_knowledge.values()))
                    last_avg = np.mean(list(last_knowledge.values()))
                    learning_gains.append(last_avg - first_avg)
                else:
                    learning_gains.append(0.0)

                # Get engagement from last state
                engagements.append(last_state.get("engagement_level", 0.5))

                # Check completion
                completions.append(any(exp.get("done", False) for exp in episode_exps))

        return EvaluationMetrics(
            average_reward=float(np.mean(total_rewards)) if total_rewards else 0.0,
            learning_gain=float(np.mean(learning_gains)) if learning_gains else 0.0,
            completion_rate=float(np.mean(completions)) if completions else 0.0,
            engagement_score=float(np.mean(engagements)) if engagements else 0.0,
            episodes_evaluated=len(episodes_to_eval),
        )

    def _evaluate_simulated(
        self,
        policy,
        num_episodes: int,
        max_steps: int,
    ) -> EvaluationMetrics:
        """Evaluate policy using simulated episodes."""
        results: List[EpisodeResult] = []

        for _ in range(num_episodes):
            result = self._run_simulated_episode(policy, max_steps)
            results.append(result)

        # Aggregate metrics
        avg_reward = np.mean([r.total_reward for r in results])
        avg_learning = np.mean([r.learning_gain for r in results])
        completion_rate = np.mean([1.0 if r.completed else 0.0 for r in results])
        avg_engagement = np.mean([r.final_engagement for r in results])

        return EvaluationMetrics(
            average_reward=float(avg_reward),
            learning_gain=float(avg_learning),
            completion_rate=float(completion_rate),
            engagement_score=float(avg_engagement),
            episodes_evaluated=num_episodes,
        )

    def _run_simulated_episode(
        self,
        policy,
        max_steps: int,
    ) -> EpisodeResult:
        """Run a single simulated episode."""
        # Initialize simulated state
        state = self._create_initial_state()
        total_reward = 0.0
        initial_knowledge = np.mean(list(state["knowledge_state"].values()))

        for step in range(max_steps):
            # Get action from policy
            action = policy.predict(state, deterministic=True)

            # Simulate outcome
            reward, next_state, done = self._simulate_step(state, action)
            total_reward += reward
            state = next_state

            if done:
                break

        final_knowledge = np.mean(list(state["knowledge_state"].values()))
        learning_gain = final_knowledge - initial_knowledge

        return EpisodeResult(
            total_reward=total_reward,
            steps=step + 1,
            learning_gain=learning_gain,
            final_engagement=state.get("engagement_level", 0.5),
            completed=done if 'done' in dir() else False,
        )

    def _create_initial_state(self) -> Dict[str, Any]:
        """Create initial state for simulation."""
        return {
            "knowledge_state": {f"topic_{i}": np.random.uniform(0.2, 0.5) for i in range(5)},
            "recent_performance": [np.random.uniform(0.4, 0.7) for _ in range(5)],
            "engagement_level": np.random.uniform(0.5, 0.8),
            "time_in_session": 0,
        }

    def _simulate_step(
        self,
        state: Dict,
        action: int,
    ) -> tuple:
        """Simulate a single step in the environment."""
        # Simple simulation of tutoring outcomes
        action_effects = {
            0: {"knowledge": 0.02, "engagement": -0.02},  # hint
            1: {"knowledge": 0.03, "engagement": 0.01},   # question
            2: {"knowledge": 0.04, "engagement": -0.01},  # explanation
            3: {"knowledge": 0.05, "engagement": 0.02},   # practice
            4: {"knowledge": 0.01, "engagement": 0.00},   # review
            5: {"knowledge": 0.00, "engagement": 0.03},   # skip
            6: {"knowledge": 0.00, "engagement": 0.05},   # encourage
            7: {"knowledge": 0.06, "engagement": -0.03},  # challenge
            8: {"knowledge": 0.02, "engagement": 0.02},   # simplify
            9: {"knowledge": 0.03, "engagement": -0.01},  # elaborate
        }

        effect = action_effects.get(action, {"knowledge": 0.01, "engagement": 0.0})

        # Update state
        next_state = dict(state)
        next_state["knowledge_state"] = dict(state["knowledge_state"])

        # Update knowledge
        for topic in next_state["knowledge_state"]:
            noise = np.random.normal(0, 0.01)
            next_state["knowledge_state"][topic] = np.clip(
                next_state["knowledge_state"][topic] + effect["knowledge"] + noise,
                0.0, 1.0
            )

        # Update engagement
        next_state["engagement_level"] = np.clip(
            state["engagement_level"] + effect["engagement"] + np.random.normal(0, 0.02),
            0.0, 1.0
        )

        # Update performance
        performance = np.random.uniform(0.3, 0.9) + 0.1 * effect["knowledge"]
        next_state["recent_performance"] = state["recent_performance"][1:] + [performance]

        # Update time
        next_state["time_in_session"] = state["time_in_session"] + 60

        # Calculate reward
        knowledge_gain = np.mean(list(next_state["knowledge_state"].values())) - \
                        np.mean(list(state["knowledge_state"].values()))
        reward = 0.5 * knowledge_gain * 10 + 0.3 * next_state["engagement_level"] + 0.2 * performance

        # Check if done (mastery achieved or disengaged)
        avg_knowledge = np.mean(list(next_state["knowledge_state"].values()))
        done = avg_knowledge > 0.9 or next_state["engagement_level"] < 0.1

        return reward, next_state, done

    def _group_by_episode(self, experiences: List[Dict]) -> Dict[str, List[Dict]]:
        """Group experiences by episode/session."""
        episodes: Dict[str, List[Dict]] = {}
        for exp in experiences:
            session_id = exp.get("session_id", "default")
            if session_id not in episodes:
                episodes[session_id] = []
            episodes[session_id].append(exp)
        return episodes

    def compare_policies(
        self,
        policies: List,
        num_episodes: int = 100,
        policy_names: Optional[List[str]] = None,
    ) -> Dict[str, EvaluationMetrics]:
        """Compare multiple policies."""
        if policy_names is None:
            policy_names = [f"policy_{i}" for i in range(len(policies))]

        results = {}
        for name, policy in zip(policy_names, policies):
            metrics = self.evaluate(policy, num_episodes)
            results[name] = metrics
            logger.info(f"Policy {name}: avg_reward={metrics.average_reward:.4f}")

        return results

    def a_b_test(
        self,
        policy_a,
        policy_b,
        experience_data: List[Dict],
        num_episodes: int = 100,
    ) -> Dict[str, Any]:
        """Run A/B test between policies using recorded data."""
        # Split data randomly
        np.random.shuffle(experience_data)
        mid = len(experience_data) // 2

        data_a = experience_data[:mid]
        data_b = experience_data[mid:]

        # Evaluate both policies
        metrics_a = self.evaluate(policy_a, num_episodes, experience_data=data_a)
        metrics_b = self.evaluate(policy_b, num_episodes, experience_data=data_b)

        # Statistical comparison
        reward_diff = metrics_a.average_reward - metrics_b.average_reward
        learning_diff = metrics_a.learning_gain - metrics_b.learning_gain

        # Determine winner
        if reward_diff > 0.05:
            winner = "policy_a"
        elif reward_diff < -0.05:
            winner = "policy_b"
        else:
            winner = "tie"

        result = {
            "policy_a_metrics": {
                "average_reward": metrics_a.average_reward,
                "learning_gain": metrics_a.learning_gain,
                "completion_rate": metrics_a.completion_rate,
                "engagement_score": metrics_a.engagement_score,
            },
            "policy_b_metrics": {
                "average_reward": metrics_b.average_reward,
                "learning_gain": metrics_b.learning_gain,
                "completion_rate": metrics_b.completion_rate,
                "engagement_score": metrics_b.engagement_score,
            },
            "reward_difference": reward_diff,
            "learning_difference": learning_diff,
            "winner": winner,
            "timestamp": datetime.utcnow().isoformat(),
        }

        self._evaluation_history.append(result)
        return result

    def get_evaluation_history(self) -> List[Dict]:
        """Get history of evaluations."""
        return self._evaluation_history
