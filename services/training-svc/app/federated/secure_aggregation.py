"""
Secure Multi-Party Computation for Federated Learning

Implements:
- Secret sharing for gradient aggregation (Shamir's Secret Sharing)
- Homomorphic encryption for privacy-preserving aggregation
- Differential privacy for gradient protection
- Secure aggregation protocols

These techniques prevent the central server from seeing individual
tenant/learner gradients while still allowing model training.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
import hashlib
import hmac
import secrets
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SecretShare:
    """A single secret share for a gradient"""
    party_id: int
    share_values: np.ndarray
    original_shape: Tuple[int, ...]
    verification_hash: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


class SecureAggregator:
    """
    Secure aggregation using Shamir's Secret Sharing
    
    Prevents aggregation server from seeing individual gradients
    while allowing correct aggregation.
    
    How it works:
    1. Each party splits their gradient into shares
    2. Parties exchange shares pairwise
    3. Each party sums their received shares
    4. Partial sums are sent to server
    5. Server aggregates partial sums = true aggregate
    
    Usage:
        aggregator = SecureAggregator(num_parties=5, threshold=3)
        shares = aggregator.create_shares(gradient, party_id=0)
        # ... distribute shares to other parties ...
        result = aggregator.reconstruct_secret(collected_shares)
    """
    
    def __init__(self, num_parties: int, threshold: int):
        """
        Args:
            num_parties: Total number of participants
            threshold: Minimum parties needed to reconstruct (t of n scheme)
        """
        if threshold > num_parties:
            raise ValueError("Threshold cannot exceed number of parties")
        if threshold < 2:
            raise ValueError("Threshold must be at least 2 for security")
        
        self.num_parties = num_parties
        self.threshold = threshold
        
        # Use large prime for finite field arithmetic
        # In practice, use 256-bit prime for security
        self.prime = 2**127 - 1
        
        # Shared randomness seeds for efficiency
        self._pairwise_seeds: Dict[Tuple[int, int], bytes] = {}
        
        logger.info(f"SecureAggregator initialized: {threshold} of {num_parties} scheme")
    
    def create_shares(
        self,
        secret: np.ndarray,
        party_id: int
    ) -> List[SecretShare]:
        """
        Create secret shares for a gradient using Shamir's Secret Sharing
        
        Args:
            secret: Gradient/parameter array to share
            party_id: ID of the party creating shares
        
        Returns:
            List of SecretShare objects for each party
        """
        original_shape = secret.shape
        secret_flat = secret.flatten().astype(np.int64)
        
        # Scale floats to integers if needed
        if secret.dtype in [np.float32, np.float64]:
            scale_factor = 1e9
            secret_flat = (secret_flat * scale_factor).astype(np.int64)
        else:
            scale_factor = 1
        
        # Create shares for each element
        all_shares = []
        
        for element_idx, value in enumerate(secret_flat):
            # Generate random polynomial coefficients
            # a_0 = secret value, a_1...a_{t-1} = random
            coeffs = [int(value % self.prime)]
            for _ in range(self.threshold - 1):
                coeffs.append(secrets.randbelow(self.prime))
            
            # Evaluate polynomial at points 1, 2, ..., num_parties
            element_shares = []
            for pid in range(1, self.num_parties + 1):
                share_value = self._evaluate_polynomial(coeffs, pid)
                element_shares.append(share_value)
            
            all_shares.append(element_shares)
        
        # Transpose: each party gets all their element shares
        party_shares = []
        for pid in range(self.num_parties):
            share_values = np.array([s[pid] for s in all_shares])
            
            # Create verification hash
            verification = self._compute_verification_hash(share_values, party_id, pid)
            
            party_shares.append(SecretShare(
                party_id=pid + 1,
                share_values=share_values,
                original_shape=original_shape,
                verification_hash=verification,
            ))
        
        return party_shares
    
    def _evaluate_polynomial(self, coeffs: List[int], x: int) -> int:
        """Evaluate polynomial at point x using Horner's method"""
        result = 0
        for coeff in reversed(coeffs):
            result = (result * x + coeff) % self.prime
        return result
    
    def _compute_verification_hash(
        self,
        share_values: np.ndarray,
        sender_id: int,
        receiver_id: int
    ) -> str:
        """Compute hash for share verification"""
        data = f"{sender_id}:{receiver_id}:{share_values.tobytes().hex()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def reconstruct_secret(
        self,
        shares: List[SecretShare],
        expected_shape: Optional[Tuple[int, ...]] = None
    ) -> np.ndarray:
        """
        Reconstruct secret from threshold shares using Lagrange interpolation
        
        Args:
            shares: List of SecretShare objects (need >= threshold)
            expected_shape: Expected output shape
        
        Returns:
            Reconstructed secret array
        """
        if len(shares) < self.threshold:
            raise ValueError(f"Need at least {self.threshold} shares, got {len(shares)}")
        
        # Use first threshold shares
        selected_shares = shares[:self.threshold]
        
        party_ids = [s.party_id for s in selected_shares]
        share_matrix = np.array([s.share_values for s in selected_shares])
        
        # Lagrange interpolation for each element
        num_elements = share_matrix.shape[1]
        secret = np.zeros(num_elements, dtype=np.int64)
        
        for elem_idx in range(num_elements):
            elem_shares = share_matrix[:, elem_idx]
            
            result = 0
            for i, pid_i in enumerate(party_ids):
                # Compute Lagrange basis polynomial L_i(0)
                numerator = 1
                denominator = 1
                
                for j, pid_j in enumerate(party_ids):
                    if i != j:
                        numerator = (numerator * (0 - pid_j)) % self.prime
                        denominator = (denominator * (pid_i - pid_j)) % self.prime
                
                # Modular inverse using Fermat's little theorem
                denom_inv = pow(int(denominator), self.prime - 2, self.prime)
                lagrange = (numerator * denom_inv) % self.prime
                
                result = (result + lagrange * int(elem_shares[i])) % self.prime
            
            secret[elem_idx] = result
        
        # Reshape to original shape
        if expected_shape:
            secret = secret.reshape(expected_shape)
        elif selected_shares[0].original_shape:
            secret = secret.reshape(selected_shares[0].original_shape)
        
        # Rescale back to float
        secret = secret.astype(np.float64) / 1e9
        
        return secret
    
    def verify_share(self, share: SecretShare, sender_id: int) -> bool:
        """Verify a share is authentic"""
        expected_hash = self._compute_verification_hash(
            share.share_values, sender_id, share.party_id
        )
        return hmac.compare_digest(share.verification_hash, expected_hash)


class HomomorphicAggregator:
    """
    Homomorphic encryption for gradient aggregation
    
    Allows server to aggregate encrypted gradients
    without seeing plaintext values.
    
    Uses additive homomorphism: E(a) + E(b) = E(a + b)
    
    Note: This is a simplified implementation. Production should use
    libraries like Microsoft SEAL, TenSEAL, or phe (Paillier).
    """
    
    def __init__(self, key_size: int = 2048):
        """
        Args:
            key_size: RSA key size for Paillier-like encryption
        """
        self.key_size = key_size
        self.public_key: Optional[Dict] = None
        self.private_key: Optional[Dict] = None
        
        # Quantization parameters
        self.scale_factor = 1e6
        self.max_value = 2**30
        
        self._generate_keys()
    
    def _generate_keys(self):
        """Generate Paillier-like keys (simplified)"""
        import random
        
        def generate_prime(bits):
            """Generate a random prime number"""
            while True:
                candidate = random.getrandbits(bits) | (1 << bits - 1) | 1
                if self._is_prime(candidate):
                    return candidate
        
        # Generate two large primes
        p = generate_prime(self.key_size // 2)
        q = generate_prime(self.key_size // 2)
        
        n = p * q
        n_sq = n * n
        g = n + 1  # Simplified generator
        
        # Compute λ = lcm(p-1, q-1)
        lambda_val = (p - 1) * (q - 1) // self._gcd(p - 1, q - 1)
        
        # Compute μ = L(g^λ mod n²)^(-1) mod n
        # where L(x) = (x - 1) / n
        g_lambda = pow(g, lambda_val, n_sq)
        l_val = (g_lambda - 1) // n
        mu = pow(l_val, -1, n)
        
        self.public_key = {'n': n, 'n_sq': n_sq, 'g': g}
        self.private_key = {'lambda': lambda_val, 'mu': mu, 'n': n}
        
        logger.info("Homomorphic keys generated")
    
    def _is_prime(self, n: int, k: int = 10) -> bool:
        """Miller-Rabin primality test"""
        if n < 2:
            return False
        if n == 2 or n == 3:
            return True
        if n % 2 == 0:
            return False
        
        # Write n-1 as 2^r * d
        r, d = 0, n - 1
        while d % 2 == 0:
            r += 1
            d //= 2
        
        # Test with k witnesses
        import random
        for _ in range(k):
            a = random.randrange(2, n - 1)
            x = pow(a, d, n)
            
            if x == 1 or x == n - 1:
                continue
            
            for _ in range(r - 1):
                x = pow(x, 2, n)
                if x == n - 1:
                    break
            else:
                return False
        
        return True
    
    def _gcd(self, a: int, b: int) -> int:
        """Greatest common divisor"""
        while b:
            a, b = b, a % b
        return a
    
    def encrypt_gradient(self, gradient: np.ndarray) -> np.ndarray:
        """
        Encrypt gradient using public key
        
        Args:
            gradient: Gradient array
        
        Returns:
            Encrypted gradient (as object array of large integers)
        """
        if self.public_key is None:
            raise ValueError("Keys not generated")
        
        n = self.public_key['n']
        n_sq = self.public_key['n_sq']
        g = self.public_key['g']
        
        # Quantize to integers
        gradient_int = np.clip(
            gradient * self.scale_factor,
            -self.max_value,
            self.max_value
        ).astype(np.int64)
        
        # Make positive for encryption
        gradient_positive = gradient_int + self.max_value
        
        encrypted = []
        for value in gradient_positive.flatten():
            # Paillier encryption: c = g^m * r^n mod n²
            r = secrets.randbelow(n - 1) + 1
            while self._gcd(r, n) != 1:
                r = secrets.randbelow(n - 1) + 1
            
            c = (pow(g, int(value), n_sq) * pow(r, n, n_sq)) % n_sq
            encrypted.append(c)
        
        return np.array(encrypted, dtype=object).reshape(gradient.shape)
    
    def aggregate_encrypted(
        self,
        encrypted_gradients: List[np.ndarray]
    ) -> np.ndarray:
        """
        Aggregate encrypted gradients homomorphically
        
        For Paillier: E(a) * E(b) = E(a + b)
        
        Args:
            encrypted_gradients: List of encrypted gradient arrays
        
        Returns:
            Encrypted aggregate
        """
        if not encrypted_gradients:
            raise ValueError("No gradients to aggregate")
        
        n_sq = self.public_key['n_sq']
        
        # Homomorphic addition via multiplication
        aggregated = encrypted_gradients[0].flatten().copy()
        
        for enc_grad in encrypted_gradients[1:]:
            for i, enc_val in enumerate(enc_grad.flatten()):
                aggregated[i] = (aggregated[i] * enc_val) % n_sq
        
        return aggregated.reshape(encrypted_gradients[0].shape)
    
    def decrypt_gradient(self, encrypted: np.ndarray) -> np.ndarray:
        """
        Decrypt aggregated gradient
        
        Args:
            encrypted: Encrypted gradient array
        
        Returns:
            Decrypted gradient
        """
        if self.private_key is None:
            raise ValueError("Private key not available")
        
        lambda_val = self.private_key['lambda']
        mu = self.private_key['mu']
        n = self.private_key['n']
        n_sq = self.public_key['n_sq']
        
        decrypted = []
        for enc_val in encrypted.flatten():
            # Paillier decryption: m = L(c^λ mod n²) * μ mod n
            c_lambda = pow(int(enc_val), lambda_val, n_sq)
            l_val = (c_lambda - 1) // n
            m = (l_val * mu) % n
            
            decrypted.append(m)
        
        # Convert back to signed values
        decrypted_array = np.array(decrypted, dtype=np.float64)
        decrypted_array = decrypted_array - self.max_value
        decrypted_array = decrypted_array / self.scale_factor
        
        return decrypted_array.reshape(encrypted.shape)


class DifferentialPrivacyAggregator:
    """
    Differential Privacy for gradient protection
    
    Adds calibrated noise to gradients to provide
    (ε, δ)-differential privacy guarantees.
    
    Key parameters:
    - ε (epsilon): Privacy budget (lower = more private)
    - δ (delta): Failure probability
    - sensitivity: Maximum gradient norm
    """
    
    def __init__(
        self,
        epsilon: float = 1.0,
        delta: float = 1e-5,
        sensitivity: float = 1.0,
        mechanism: str = "gaussian"
    ):
        """
        Args:
            epsilon: Privacy budget
            delta: Failure probability
            sensitivity: L2 sensitivity (max gradient norm change)
            mechanism: "gaussian" or "laplace"
        """
        self.epsilon = epsilon
        self.delta = delta
        self.sensitivity = sensitivity
        self.mechanism = mechanism
        
        # Compute noise scale
        if mechanism == "gaussian":
            # Gaussian mechanism for (ε, δ)-DP
            self.noise_scale = self._compute_gaussian_scale()
        else:
            # Laplace mechanism for ε-DP
            self.noise_scale = sensitivity / epsilon
        
        # Track privacy budget consumption
        self.budget_consumed = 0.0
        self.queries_count = 0
        
        logger.info(
            f"DifferentialPrivacy: ε={epsilon}, δ={delta}, "
            f"mechanism={mechanism}, noise_scale={self.noise_scale:.4f}"
        )
    
    def _compute_gaussian_scale(self) -> float:
        """Compute Gaussian noise scale for (ε, δ)-DP"""
        # σ ≥ sensitivity * √(2 * ln(1.25/δ)) / ε
        import math
        return self.sensitivity * math.sqrt(2 * math.log(1.25 / self.delta)) / self.epsilon
    
    def add_noise(self, gradient: np.ndarray) -> np.ndarray:
        """
        Add differential privacy noise to gradient
        
        Args:
            gradient: Original gradient
        
        Returns:
            Privatized gradient
        """
        # Clip gradient to bound sensitivity
        gradient_norm = np.linalg.norm(gradient)
        if gradient_norm > self.sensitivity:
            gradient = gradient * (self.sensitivity / gradient_norm)
        
        # Generate noise
        if self.mechanism == "gaussian":
            noise = np.random.normal(0, self.noise_scale, gradient.shape)
        else:
            noise = np.random.laplace(0, self.noise_scale, gradient.shape)
        
        # Track budget
        self.budget_consumed += self.epsilon
        self.queries_count += 1
        
        return gradient + noise
    
    def aggregate_with_dp(
        self,
        gradients: List[np.ndarray],
        num_clients: int
    ) -> np.ndarray:
        """
        Aggregate gradients with differential privacy
        
        Implements the Gaussian mechanism with secure aggregation
        
        Args:
            gradients: List of client gradients
            num_clients: Total number of clients (for noise scaling)
        
        Returns:
            DP-aggregated gradient
        """
        # Clip each gradient
        clipped_gradients = []
        for grad in gradients:
            grad_norm = np.linalg.norm(grad)
            if grad_norm > self.sensitivity:
                grad = grad * (self.sensitivity / grad_norm)
            clipped_gradients.append(grad)
        
        # Sum gradients
        aggregated = np.sum(clipped_gradients, axis=0)
        
        # Add noise calibrated for aggregate
        # Sensitivity is multiplied by number of contributing clients
        aggregate_sensitivity = self.sensitivity * len(gradients)
        
        if self.mechanism == "gaussian":
            import math
            noise_scale = aggregate_sensitivity * math.sqrt(2 * math.log(1.25 / self.delta)) / self.epsilon
            noise = np.random.normal(0, noise_scale, aggregated.shape)
        else:
            noise_scale = aggregate_sensitivity / self.epsilon
            noise = np.random.laplace(0, noise_scale, aggregated.shape)
        
        # Average
        result = (aggregated + noise) / len(gradients)
        
        # Track budget
        self.budget_consumed += self.epsilon
        self.queries_count += 1
        
        return result
    
    def get_privacy_report(self) -> Dict[str, Any]:
        """Get privacy accounting report"""
        return {
            "epsilon_per_query": self.epsilon,
            "delta": self.delta,
            "total_queries": self.queries_count,
            "total_budget_consumed": self.budget_consumed,
            "mechanism": self.mechanism,
            "noise_scale": self.noise_scale,
            "sensitivity": self.sensitivity,
        }
    
    def reset_budget(self):
        """Reset privacy budget tracking"""
        self.budget_consumed = 0.0
        self.queries_count = 0
