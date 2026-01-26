"""
Curriculum Embeddings System
Creates semantic embeddings for skills, standards, and content

Use cases:
- Find similar skills for scaffolding
- Match content to learning objectives
- Recommend prerequisite skills
- Semantic search across curriculum
"""

import torch
import torch.nn as nn
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
import pickle
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Lazy imports for heavy dependencies
transformers = None
sklearn_cluster = None
sklearn_metrics = None
networkx = None


def _load_transformers():
    """Lazy load transformers library"""
    global transformers
    if transformers is None:
        import transformers as _transformers
        transformers = _transformers
    return transformers


def _load_sklearn_cluster():
    """Lazy load sklearn clustering"""
    global sklearn_cluster
    if sklearn_cluster is None:
        from sklearn import cluster as _cluster
        sklearn_cluster = _cluster
    return sklearn_cluster


def _load_sklearn_metrics():
    """Lazy load sklearn metrics"""
    global sklearn_metrics
    if sklearn_metrics is None:
        from sklearn.metrics import pairwise as _pairwise
        sklearn_metrics = _pairwise
    return sklearn_metrics


def _load_networkx():
    """Lazy load networkx"""
    global networkx
    if networkx is None:
        import networkx as _nx
        networkx = _nx
    return networkx


@dataclass
class Skill:
    """Skill definition for curriculum embedding"""
    skill_id: str
    name: str
    description: str
    domain: str  # math, reading, science, etc.
    grade_band: str  # K-2, 3-5, 6-8, 9-12
    standard_codes: List[str] = field(default_factory=list)  # e.g., ["CCSS.MATH.5.NF.A.1"]
    prerequisites: List[str] = field(default_factory=list)  # skill_ids that should come before
    keywords: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "skill_id": self.skill_id,
            "name": self.name,
            "description": self.description,
            "domain": self.domain,
            "grade_band": self.grade_band,
            "standard_codes": self.standard_codes,
            "prerequisites": self.prerequisites,
            "keywords": self.keywords
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Skill":
        """Create from dictionary"""
        return cls(
            skill_id=data["skill_id"],
            name=data["name"],
            description=data["description"],
            domain=data["domain"],
            grade_band=data["grade_band"],
            standard_codes=data.get("standard_codes", []),
            prerequisites=data.get("prerequisites", []),
            keywords=data.get("keywords", [])
        )
    
    def to_text(self) -> str:
        """Convert to text representation for embedding"""
        parts = [
            self.name,
            self.description,
        ]
        if self.keywords:
            parts.append(f"Keywords: {', '.join(self.keywords)}")
        if self.standard_codes:
            parts.append(f"Standards: {', '.join(self.standard_codes)}")
        return ". ".join(parts)


@dataclass
class Content:
    """Learning content item"""
    content_id: str
    title: str
    description: str
    content_type: str  # video, activity, assessment, reading, etc.
    difficulty: float  # 0-1
    skill_ids: List[str] = field(default_factory=list)  # Skills covered
    duration_minutes: Optional[int] = None
    grade_level: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "content_id": self.content_id,
            "title": self.title,
            "description": self.description,
            "content_type": self.content_type,
            "difficulty": self.difficulty,
            "skill_ids": self.skill_ids,
            "duration_minutes": self.duration_minutes,
            "grade_level": self.grade_level,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Content":
        """Create from dictionary"""
        return cls(
            content_id=data["content_id"],
            title=data["title"],
            description=data["description"],
            content_type=data["content_type"],
            difficulty=data["difficulty"],
            skill_ids=data.get("skill_ids", []),
            duration_minutes=data.get("duration_minutes"),
            grade_level=data.get("grade_level"),
            metadata=data.get("metadata", {})
        )
    
    def to_text(self) -> str:
        """Convert to text representation for embedding"""
        return f"{self.title}. {self.description}"


@dataclass
class Standard:
    """Educational standard (e.g., Common Core)"""
    standard_code: str
    description: str
    domain: str
    grade_level: str
    subject: str
    parent_standard: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "standard_code": self.standard_code,
            "description": self.description,
            "domain": self.domain,
            "grade_level": self.grade_level,
            "subject": self.subject,
            "parent_standard": self.parent_standard
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Standard":
        """Create from dictionary"""
        return cls(
            standard_code=data["standard_code"],
            description=data["description"],
            domain=data["domain"],
            grade_level=data["grade_level"],
            subject=data["subject"],
            parent_standard=data.get("parent_standard")
        )
    
    def to_text(self) -> str:
        """Convert to text representation for embedding"""
        return f"{self.standard_code}: {self.description}"


@dataclass
class SearchResult:
    """Result from semantic search"""
    item_id: str
    score: float
    item_type: str  # "skill", "content", "standard"
    item: Any  # The actual Skill, Content, or Standard object


class CurriculumEmbeddings:
    """
    Creates and manages embeddings for curriculum elements
    
    Uses sentence transformers for semantic understanding of:
    - Skills and learning objectives
    - Content items (videos, activities, assessments)
    - Educational standards (Common Core, etc.)
    
    Supports:
    - Semantic similarity search
    - Content-to-skill matching
    - Learning path generation via prerequisite graph
    - Skill clustering for curriculum analysis
    """
    
    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        device: str = "cpu",
        cache_dir: Optional[str] = None
    ):
        self.device = torch.device(device)
        self.model_name = model_name
        self.cache_dir = cache_dir
        
        # Lazy-loaded components
        self._tokenizer = None
        self._model = None
        
        # Storage
        self.skill_embeddings: Dict[str, np.ndarray] = {}
        self.content_embeddings: Dict[str, np.ndarray] = {}
        self.standard_embeddings: Dict[str, np.ndarray] = {}
        
        self.skills: Dict[str, Skill] = {}
        self.contents: Dict[str, Content] = {}
        self.standards: Dict[str, Standard] = {}
        
        # Skill graph for prerequisite tracking (lazy loaded)
        self._skill_graph = None
        
        # Embedding dimension (set after first encoding)
        self._embedding_dim = None
        
        logger.info(f"CurriculumEmbeddings initialized with {model_name} on {device}")
    
    @property
    def tokenizer(self):
        """Lazy load tokenizer"""
        if self._tokenizer is None:
            tf = _load_transformers()
            self._tokenizer = tf.AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir
            )
        return self._tokenizer
    
    @property
    def model(self):
        """Lazy load model"""
        if self._model is None:
            tf = _load_transformers()
            self._model = tf.AutoModel.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir
            ).to(self.device)
            self._model.eval()
            logger.info(f"Loaded embedding model: {self.model_name}")
        return self._model
    
    @property
    def skill_graph(self):
        """Lazy load skill graph"""
        if self._skill_graph is None:
            nx = _load_networkx()
            self._skill_graph = nx.DiGraph()
        return self._skill_graph
    
    @property
    def embedding_dim(self) -> int:
        """Get embedding dimension"""
        if self._embedding_dim is None:
            # Encode a test string to get dimension
            test_emb = self.encode(["test"])
            self._embedding_dim = test_emb.shape[1]
        return self._embedding_dim
    
    def _mean_pooling(
        self,
        model_output: torch.Tensor,
        attention_mask: torch.Tensor
    ) -> torch.Tensor:
        """Mean pooling to get sentence embeddings"""
        token_embeddings = model_output[0]
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
            input_mask_expanded.sum(1), min=1e-9
        )
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Encode texts to embeddings
        
        Args:
            texts: List of text strings
            batch_size: Batch size for encoding
        
        Returns:
            Embeddings array [len(texts), embedding_dim]
        """
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            # Tokenize
            encoded = self.tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            ).to(self.device)
            
            # Generate embeddings
            with torch.no_grad():
                model_output = self.model(**encoded)
            
            # Mean pooling
            embeddings = self._mean_pooling(model_output, encoded['attention_mask'])
            
            # Normalize
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
            
            all_embeddings.append(embeddings.cpu().numpy())
        
        return np.vstack(all_embeddings) if len(all_embeddings) > 1 else all_embeddings[0]
    
    def add_skill(self, skill: Skill) -> np.ndarray:
        """
        Add a skill and compute its embedding
        
        Embedding is based on: name + description + keywords
        
        Args:
            skill: Skill to add
            
        Returns:
            Embedding vector
        """
        # Create text representation
        text = skill.to_text()
        
        # Generate embedding
        embedding = self.encode([text])[0]
        
        # Store
        self.skills[skill.skill_id] = skill
        self.skill_embeddings[skill.skill_id] = embedding
        
        # Add to skill graph
        self.skill_graph.add_node(skill.skill_id, skill=skill)
        for prereq_id in skill.prerequisites:
            self.skill_graph.add_edge(prereq_id, skill.skill_id)
        
        logger.debug(f"Added skill: {skill.skill_id}")
        return embedding
    
    def add_skills_batch(self, skills: List[Skill]) -> Dict[str, np.ndarray]:
        """
        Add multiple skills efficiently in a batch
        
        Args:
            skills: List of skills to add
            
        Returns:
            Dictionary of skill_id -> embedding
        """
        if not skills:
            return {}
        
        # Create text representations
        texts = [skill.to_text() for skill in skills]
        
        # Batch encode
        embeddings = self.encode(texts)
        
        # Store all
        result = {}
        for skill, embedding in zip(skills, embeddings):
            self.skills[skill.skill_id] = skill
            self.skill_embeddings[skill.skill_id] = embedding
            result[skill.skill_id] = embedding
            
            # Add to skill graph
            self.skill_graph.add_node(skill.skill_id, skill=skill)
            for prereq_id in skill.prerequisites:
                self.skill_graph.add_edge(prereq_id, skill.skill_id)
        
        logger.info(f"Added {len(skills)} skills in batch")
        return result
    
    def add_content(self, content: Content) -> np.ndarray:
        """
        Add content and compute its embedding
        
        Args:
            content: Content to add
            
        Returns:
            Embedding vector
        """
        # Create text representation
        text = content.to_text()
        
        # Generate embedding
        embedding = self.encode([text])[0]
        
        # Store
        self.contents[content.content_id] = content
        self.content_embeddings[content.content_id] = embedding
        
        logger.debug(f"Added content: {content.content_id}")
        return embedding
    
    def add_content_batch(self, contents: List[Content]) -> Dict[str, np.ndarray]:
        """
        Add multiple content items efficiently in a batch
        
        Args:
            contents: List of content items to add
            
        Returns:
            Dictionary of content_id -> embedding
        """
        if not contents:
            return {}
        
        # Create text representations
        texts = [content.to_text() for content in contents]
        
        # Batch encode
        embeddings = self.encode(texts)
        
        # Store all
        result = {}
        for content, embedding in zip(contents, embeddings):
            self.contents[content.content_id] = content
            self.content_embeddings[content.content_id] = embedding
            result[content.content_id] = embedding
        
        logger.info(f"Added {len(contents)} content items in batch")
        return result
    
    def add_standard(self, standard: Standard) -> np.ndarray:
        """
        Add an educational standard and compute its embedding
        
        Args:
            standard: Standard to add
            
        Returns:
            Embedding vector
        """
        # Create text representation
        text = standard.to_text()
        
        # Generate embedding
        embedding = self.encode([text])[0]
        
        # Store
        self.standards[standard.standard_code] = standard
        self.standard_embeddings[standard.standard_code] = embedding
        
        logger.debug(f"Added standard: {standard.standard_code}")
        return embedding
    
    def find_similar_skills(
        self,
        skill_id: str,
        n: int = 5,
        domain_filter: Optional[str] = None,
        grade_band_filter: Optional[str] = None,
        min_similarity: float = 0.0
    ) -> List[Tuple[str, float]]:
        """
        Find skills similar to given skill
        
        Args:
            skill_id: Source skill
            n: Number of similar skills
            domain_filter: Optional domain filter (e.g., "math")
            grade_band_filter: Optional grade band filter (e.g., "K-2")
            min_similarity: Minimum similarity threshold
        
        Returns:
            List of (skill_id, similarity_score) tuples
        """
        if skill_id not in self.skill_embeddings:
            logger.warning(f"Skill not found: {skill_id}")
            return []
        
        source_embedding = self.skill_embeddings[skill_id]
        
        # Calculate similarities
        similarities = []
        for other_id, other_embedding in self.skill_embeddings.items():
            if other_id == skill_id:
                continue
            
            other_skill = self.skills[other_id]
            
            # Apply domain filter
            if domain_filter and other_skill.domain != domain_filter:
                continue
            
            # Apply grade band filter
            if grade_band_filter and other_skill.grade_band != grade_band_filter:
                continue
            
            # Cosine similarity (embeddings are normalized)
            sim = float(np.dot(source_embedding, other_embedding))
            
            if sim >= min_similarity:
                similarities.append((other_id, sim))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:n]
    
    def find_similar_skills_by_text(
        self,
        text: str,
        n: int = 5,
        domain_filter: Optional[str] = None
    ) -> List[Tuple[str, float]]:
        """
        Find skills similar to a text description
        
        Args:
            text: Text to match against
            n: Number of results
            domain_filter: Optional domain filter
            
        Returns:
            List of (skill_id, similarity_score) tuples
        """
        # Encode the query text
        query_embedding = self.encode([text])[0]
        
        # Calculate similarities
        similarities = []
        for skill_id, skill_embedding in self.skill_embeddings.items():
            skill = self.skills[skill_id]
            
            if domain_filter and skill.domain != domain_filter:
                continue
            
            sim = float(np.dot(query_embedding, skill_embedding))
            similarities.append((skill_id, sim))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:n]
    
    def recommend_content_for_skill(
        self,
        skill_id: str,
        n: int = 10,
        difficulty_range: Optional[Tuple[float, float]] = None,
        content_type_filter: Optional[str] = None,
        boost_tagged: float = 1.3
    ) -> List[Tuple[str, float]]:
        """
        Recommend content items for a skill
        
        Args:
            skill_id: Target skill
            n: Number of recommendations
            difficulty_range: Optional (min, max) difficulty filter
            content_type_filter: Optional content type filter (e.g., "video")
            boost_tagged: Score multiplier for explicitly tagged content
        
        Returns:
            List of (content_id, relevance_score) tuples
        """
        if skill_id not in self.skill_embeddings:
            logger.warning(f"Skill not found: {skill_id}")
            return []
        
        skill_embedding = self.skill_embeddings[skill_id]
        
        # Calculate content relevance
        scores = []
        for content_id, content_embedding in self.content_embeddings.items():
            content = self.contents[content_id]
            
            # Apply difficulty filter
            if difficulty_range:
                min_diff, max_diff = difficulty_range
                if not (min_diff <= content.difficulty <= max_diff):
                    continue
            
            # Apply content type filter
            if content_type_filter and content.content_type != content_type_filter:
                continue
            
            # Base semantic similarity
            base_similarity = float(np.dot(skill_embedding, content_embedding))
            
            # Boost score if skill is explicitly tagged
            if skill_id in content.skill_ids:
                score = base_similarity * boost_tagged
            else:
                score = base_similarity
            
            scores.append((content_id, score))
        
        # Sort by score
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:n]
    
    def recommend_content_for_learner(
        self,
        skill_masteries: Dict[str, float],
        n: int = 10,
        target_difficulty_buffer: float = 0.2
    ) -> List[Tuple[str, float, str]]:
        """
        Recommend content based on learner's skill mastery profile
        
        Args:
            skill_masteries: Dict of skill_id -> mastery (0-1)
            n: Number of recommendations
            target_difficulty_buffer: How far from mastery to target difficulty
            
        Returns:
            List of (content_id, score, reason) tuples
        """
        recommendations = []
        
        for skill_id, mastery in skill_masteries.items():
            if skill_id not in self.skill_embeddings:
                continue
            
            # Target content slightly above current mastery
            target_difficulty = min(1.0, mastery + target_difficulty_buffer)
            difficulty_range = (max(0, mastery - 0.1), target_difficulty + 0.1)
            
            # Get content for this skill
            skill_content = self.recommend_content_for_skill(
                skill_id,
                n=3,
                difficulty_range=difficulty_range
            )
            
            # Weight by how much the skill needs work (lower mastery = higher weight)
            need_weight = 1.0 - mastery
            
            for content_id, base_score in skill_content:
                weighted_score = base_score * (1 + need_weight)
                reason = f"Recommended for {skill_id} (mastery: {mastery:.0%})"
                recommendations.append((content_id, weighted_score, reason))
        
        # Deduplicate and sort
        seen = set()
        unique_recs = []
        for content_id, score, reason in sorted(recommendations, key=lambda x: x[1], reverse=True):
            if content_id not in seen:
                seen.add(content_id)
                unique_recs.append((content_id, score, reason))
        
        return unique_recs[:n]
    
    def get_learning_path(
        self,
        target_skill_id: str,
        mastered_skills: List[str]
    ) -> List[str]:
        """
        Generate learning path from mastered skills to target skill
        
        Uses prerequisite graph to find optimal path
        
        Args:
            target_skill_id: Goal skill
            mastered_skills: Skills already mastered
        
        Returns:
            Ordered list of skill_ids to learn
        """
        nx = _load_networkx()
        
        if target_skill_id not in self.skill_graph:
            return [target_skill_id]
        
        # Find all skills needed (ancestors in graph)
        prerequisites = nx.ancestors(self.skill_graph, target_skill_id)
        prerequisites.add(target_skill_id)
        
        # Remove already mastered
        unmastered = prerequisites - set(mastered_skills)
        
        if not unmastered:
            return []  # Already mastered target
        
        # Topological sort to get learning order
        subgraph = self.skill_graph.subgraph(unmastered)
        try:
            learning_path = list(nx.topological_sort(subgraph))
        except nx.NetworkXError:
            # Cycle detected, fall back to arbitrary order
            logger.warning(f"Cycle detected in prerequisite graph for {target_skill_id}")
            learning_path = list(unmastered)
        
        return learning_path
    
    def get_prerequisite_skills(self, skill_id: str) -> List[str]:
        """Get direct prerequisites for a skill"""
        nx = _load_networkx()
        
        if skill_id not in self.skill_graph:
            return []
        
        return list(self.skill_graph.predecessors(skill_id))
    
    def get_dependent_skills(self, skill_id: str) -> List[str]:
        """Get skills that depend on this skill"""
        nx = _load_networkx()
        
        if skill_id not in self.skill_graph:
            return []
        
        return list(self.skill_graph.successors(skill_id))
    
    def semantic_search(
        self,
        query: str,
        search_type: str = "skills",
        n: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """
        Semantic search across skills, content, or standards
        
        Args:
            query: Natural language query
            search_type: "skills", "content", "standards", or "all"
            n: Number of results
            filters: Optional filters (domain, grade_band, etc.)
        
        Returns:
            List of SearchResult objects
        """
        # Encode query
        query_embedding = self.encode([query])[0]
        
        results = []
        
        # Search skills
        if search_type in ("skills", "all"):
            for skill_id, skill_embedding in self.skill_embeddings.items():
                skill = self.skills[skill_id]
                
                # Apply filters
                if filters:
                    if filters.get("domain") and skill.domain != filters["domain"]:
                        continue
                    if filters.get("grade_band") and skill.grade_band != filters["grade_band"]:
                        continue
                
                similarity = float(np.dot(query_embedding, skill_embedding))
                results.append(SearchResult(
                    item_id=skill_id,
                    score=similarity,
                    item_type="skill",
                    item=skill
                ))
        
        # Search content
        if search_type in ("content", "all"):
            for content_id, content_embedding in self.content_embeddings.items():
                content = self.contents[content_id]
                
                # Apply filters
                if filters:
                    if filters.get("content_type") and content.content_type != filters["content_type"]:
                        continue
                    if filters.get("max_difficulty") and content.difficulty > filters["max_difficulty"]:
                        continue
                
                similarity = float(np.dot(query_embedding, content_embedding))
                results.append(SearchResult(
                    item_id=content_id,
                    score=similarity,
                    item_type="content",
                    item=content
                ))
        
        # Search standards
        if search_type in ("standards", "all"):
            for standard_code, standard_embedding in self.standard_embeddings.items():
                standard = self.standards[standard_code]
                
                # Apply filters
                if filters:
                    if filters.get("subject") and standard.subject != filters["subject"]:
                        continue
                
                similarity = float(np.dot(query_embedding, standard_embedding))
                results.append(SearchResult(
                    item_id=standard_code,
                    score=similarity,
                    item_type="standard",
                    item=standard
                ))
        
        # Sort by score and return top N
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:n]
    
    def match_content_to_standards(
        self,
        content_id: str,
        n: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Find standards that match a piece of content
        
        Args:
            content_id: Content to match
            n: Number of standards to return
            
        Returns:
            List of (standard_code, similarity) tuples
        """
        if content_id not in self.content_embeddings:
            return []
        
        content_embedding = self.content_embeddings[content_id]
        
        matches = []
        for standard_code, standard_embedding in self.standard_embeddings.items():
            similarity = float(np.dot(content_embedding, standard_embedding))
            matches.append((standard_code, similarity))
        
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[:n]
    
    def build_skill_clusters(
        self,
        n_clusters: int = 10,
        method: str = "kmeans"
    ) -> Dict[int, List[str]]:
        """
        Cluster skills by semantic similarity
        
        Useful for identifying skill families and curriculum analysis
        
        Args:
            n_clusters: Number of clusters
            method: Clustering method ("kmeans" or "agglomerative")
            
        Returns:
            Dictionary mapping cluster_id to list of skill_ids
        """
        if not self.skill_embeddings:
            return {}
        
        sklearn_cluster_lib = _load_sklearn_cluster()
        
        # Get all embeddings
        skill_ids = list(self.skill_embeddings.keys())
        embeddings = np.array([self.skill_embeddings[sid] for sid in skill_ids])
        
        # Clustering
        if method == "kmeans":
            clusterer = sklearn_cluster_lib.KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        else:
            clusterer = sklearn_cluster_lib.AgglomerativeClustering(n_clusters=n_clusters)
        
        labels = clusterer.fit_predict(embeddings)
        
        # Group by cluster
        clusters = {}
        for skill_id, label in zip(skill_ids, labels):
            label = int(label)
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(skill_id)
        
        logger.info(f"Built {len(clusters)} skill clusters using {method}")
        return clusters
    
    def get_cluster_summary(self, clusters: Dict[int, List[str]]) -> Dict[int, Dict[str, Any]]:
        """
        Get summary statistics for skill clusters
        
        Args:
            clusters: Cluster dictionary from build_skill_clusters
            
        Returns:
            Dictionary with cluster summaries
        """
        summaries = {}
        
        for cluster_id, skill_ids in clusters.items():
            skills = [self.skills[sid] for sid in skill_ids if sid in self.skills]
            
            # Count domains
            domain_counts = {}
            grade_band_counts = {}
            
            for skill in skills:
                domain_counts[skill.domain] = domain_counts.get(skill.domain, 0) + 1
                grade_band_counts[skill.grade_band] = grade_band_counts.get(skill.grade_band, 0) + 1
            
            # Get most common keywords
            all_keywords = []
            for skill in skills:
                all_keywords.extend(skill.keywords)
            keyword_counts = {}
            for kw in all_keywords:
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
            top_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            summaries[cluster_id] = {
                "size": len(skill_ids),
                "skills": skill_ids,
                "domain_distribution": domain_counts,
                "grade_band_distribution": grade_band_counts,
                "top_keywords": [kw for kw, _ in top_keywords],
                "primary_domain": max(domain_counts.items(), key=lambda x: x[1])[0] if domain_counts else None
            }
        
        return summaries
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the embedding index"""
        return {
            "num_skills": len(self.skills),
            "num_contents": len(self.contents),
            "num_standards": len(self.standards),
            "embedding_dim": self.embedding_dim if self.skill_embeddings else None,
            "model_name": self.model_name,
            "skill_graph_nodes": self.skill_graph.number_of_nodes() if self._skill_graph else 0,
            "skill_graph_edges": self.skill_graph.number_of_edges() if self._skill_graph else 0
        }
    
    def save(self, filepath: str):
        """
        Save embeddings and metadata to file
        
        Args:
            filepath: Path to save file
        """
        # Convert skills/contents/standards to dicts for serialization
        data = {
            'skill_embeddings': self.skill_embeddings,
            'content_embeddings': self.content_embeddings,
            'standard_embeddings': self.standard_embeddings,
            'skills': {k: v.to_dict() for k, v in self.skills.items()},
            'contents': {k: v.to_dict() for k, v in self.contents.items()},
            'standards': {k: v.to_dict() for k, v in self.standards.items()},
            'model_name': self.model_name,
        }
        
        # Save graph separately if exists
        if self._skill_graph is not None:
            nx = _load_networkx()
            data['skill_graph_edges'] = list(self.skill_graph.edges())
        
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        
        logger.info(f"Saved curriculum embeddings to {filepath}")
    
    def load(self, filepath: str):
        """
        Load embeddings and metadata from file
        
        Args:
            filepath: Path to load file
        """
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        self.skill_embeddings = data['skill_embeddings']
        self.content_embeddings = data['content_embeddings']
        self.standard_embeddings = data.get('standard_embeddings', {})
        
        # Reconstruct dataclass objects
        self.skills = {k: Skill.from_dict(v) for k, v in data['skills'].items()}
        self.contents = {k: Content.from_dict(v) for k, v in data['contents'].items()}
        self.standards = {k: Standard.from_dict(v) for k, v in data.get('standards', {}).items()}
        
        # Reconstruct skill graph
        if 'skill_graph_edges' in data:
            nx = _load_networkx()
            self._skill_graph = nx.DiGraph()
            for skill_id, skill in self.skills.items():
                self.skill_graph.add_node(skill_id, skill=skill)
            self.skill_graph.add_edges_from(data['skill_graph_edges'])
        
        logger.info(f"Loaded curriculum embeddings from {filepath}: {self.get_stats()}")


# Example usage
if __name__ == "__main__":
    # Initialize embeddings system
    embedder = CurriculumEmbeddings()
    
    # Add sample skills
    skills = [
        Skill(
            skill_id="add_1_digit",
            name="Single-digit addition",
            description="Add two single-digit numbers (0-9)",
            domain="math",
            grade_band="K-2",
            standard_codes=["CCSS.MATH.1.OA.C.6"],
            prerequisites=[],
            keywords=["addition", "sum", "plus", "basic math"]
        ),
        Skill(
            skill_id="add_2_digit",
            name="Two-digit addition",
            description="Add two-digit numbers without regrouping",
            domain="math",
            grade_band="K-2",
            standard_codes=["CCSS.MATH.2.NBT.B.5"],
            prerequisites=["add_1_digit"],
            keywords=["addition", "two-digit", "place value"]
        ),
        Skill(
            skill_id="add_regrouping",
            name="Addition with regrouping",
            description="Add multi-digit numbers with carrying/regrouping",
            domain="math",
            grade_band="3-5",
            standard_codes=["CCSS.MATH.3.NBT.A.2"],
            prerequisites=["add_2_digit"],
            keywords=["addition", "regrouping", "carrying", "place value"]
        ),
    ]
    
    for skill in skills:
        embedder.add_skill(skill)
    
    # Add sample content
    contents = [
        Content(
            content_id="video_001",
            title="Introduction to Addition",
            description="Learn how to add single-digit numbers using visual aids and examples",
            content_type="video",
            difficulty=0.2,
            skill_ids=["add_1_digit"]
        ),
        Content(
            content_id="practice_001",
            title="Two-Digit Addition Practice",
            description="Practice adding two-digit numbers with interactive exercises",
            content_type="activity",
            difficulty=0.4,
            skill_ids=["add_2_digit"]
        ),
    ]
    
    for content in contents:
        embedder.add_content(content)
    
    # Find similar skills
    print("Skills similar to 'add_2_digit':")
    similar = embedder.find_similar_skills("add_2_digit", n=2)
    for skill_id, score in similar:
        print(f"  {skill_id}: {score:.3f}")
    
    # Recommend content
    print("\nContent recommendations for 'add_1_digit':")
    recs = embedder.recommend_content_for_skill("add_1_digit")
    for content_id, score in recs:
        print(f"  {content_id}: {score:.3f}")
    
    # Learning path
    print("\nLearning path to 'add_regrouping' from nothing:")
    path = embedder.get_learning_path("add_regrouping", mastered_skills=[])
    print(f"  {' → '.join(path)}")
    
    # Semantic search
    print("\nSemantic search for 'how to add numbers with carrying':")
    results = embedder.semantic_search(
        "how to add numbers with carrying",
        search_type="skills",
        n=2
    )
    for result in results:
        skill = result.item
        print(f"  {result.item_id} ({skill.name}): {result.score:.3f}")
    
    # Stats
    print(f"\nEmbedding stats: {embedder.get_stats()}")
