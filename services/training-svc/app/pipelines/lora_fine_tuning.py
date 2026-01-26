"""
LoRA (Low-Rank Adaptation) Fine-Tuning Pipeline
Personalizes LLMs for individual learners using efficient parameter updates

Based on Hu et al. (2021) "LoRA: Low-Rank Adaptation of Large Language Models"

Use cases:
- Personalized homework helper
- Adaptive tutoring responses
- Learner-specific hint generation
"""

import torch
import torch.nn as nn
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
import json
from pathlib import Path
import logging
import os

logger = logging.getLogger(__name__)

# Lazy imports for heavy dependencies
transformers = None
peft = None
datasets_lib = None


def _load_transformers():
    """Lazy load transformers library"""
    global transformers
    if transformers is None:
        import transformers as _transformers
        transformers = _transformers
    return transformers


def _load_peft():
    """Lazy load PEFT library"""
    global peft
    if peft is None:
        import peft as _peft
        peft = _peft
    return peft


def _load_datasets():
    """Lazy load datasets library"""
    global datasets_lib
    if datasets_lib is None:
        import datasets as _datasets
        datasets_lib = _datasets
    return datasets_lib


@dataclass
class FineTuningExample:
    """Training example for fine-tuning"""
    prompt: str
    response: str
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "prompt": self.prompt,
            "response": self.response,
            "metadata": self.metadata or {}
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FineTuningExample":
        """Create from dictionary"""
        return cls(
            prompt=data["prompt"],
            response=data["response"],
            metadata=data.get("metadata")
        )


@dataclass
class LearnerProfile:
    """Learner profile for personalization"""
    learner_id: str
    grade_level: int
    reading_level: str  # "below", "at", "above"
    learning_style: str  # "visual", "verbal", "kinesthetic"
    iep_goals: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    challenges: List[str] = field(default_factory=list)
    preferred_language: str = "en"
    accessibility_needs: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "learner_id": self.learner_id,
            "grade_level": self.grade_level,
            "reading_level": self.reading_level,
            "learning_style": self.learning_style,
            "iep_goals": self.iep_goals,
            "strengths": self.strengths,
            "challenges": self.challenges,
            "preferred_language": self.preferred_language,
            "accessibility_needs": self.accessibility_needs
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LearnerProfile":
        """Create from dictionary"""
        return cls(
            learner_id=data["learner_id"],
            grade_level=data["grade_level"],
            reading_level=data.get("reading_level", "at"),
            learning_style=data.get("learning_style", "verbal"),
            iep_goals=data.get("iep_goals", []),
            strengths=data.get("strengths", []),
            challenges=data.get("challenges", []),
            preferred_language=data.get("preferred_language", "en"),
            accessibility_needs=data.get("accessibility_needs", [])
        )


@dataclass
class FineTuningConfig:
    """Configuration for LoRA fine-tuning"""
    lora_r: int = 8  # LoRA rank
    lora_alpha: int = 16
    lora_dropout: float = 0.1
    target_modules: List[str] = field(default_factory=lambda: ["q_proj", "v_proj"])
    num_epochs: int = 3
    batch_size: int = 4
    learning_rate: float = 3e-4
    max_length: int = 512
    warmup_steps: int = 50
    logging_steps: int = 10
    save_strategy: str = "epoch"


@dataclass
class TrainingMetrics:
    """Metrics from fine-tuning run"""
    train_loss: float
    epochs: int
    examples_count: int
    trainable_params: int
    total_params: int
    training_time_seconds: float = 0.0
    
    @property
    def trainable_percentage(self) -> float:
        """Percentage of trainable parameters"""
        if self.total_params == 0:
            return 0.0
        return (self.trainable_params / self.total_params) * 100


class LoRAFineTuner:
    """
    LoRA-based fine-tuning for learner personalization
    
    Advantages:
    - Only trains <1% of parameters (efficient)
    - Fast adaptation (minutes instead of hours)
    - Easy to manage multiple learner models
    - Can switch between learners quickly
    
    Based on: Hu et al. (2021) "LoRA: Low-Rank Adaptation of Large Language Models"
    """
    
    def __init__(
        self,
        base_model_name: str = "microsoft/phi-2",  # Small, efficient base model
        device: str = "cpu",
        lora_r: int = 8,  # LoRA rank
        lora_alpha: int = 16,
        lora_dropout: float = 0.1,
        cache_dir: Optional[str] = None
    ):
        self.device = torch.device(device)
        self.base_model_name = base_model_name
        self.cache_dir = cache_dir
        
        # LoRA configuration parameters
        self.lora_r = lora_r
        self.lora_alpha = lora_alpha
        self.lora_dropout = lora_dropout
        
        # Lazy-loaded components
        self._tokenizer = None
        self._base_model = None
        self._lora_config = None
        
        # Cache for learner adapters
        self.learner_adapters: Dict[str, Any] = {}
        
        # Cache for learner profiles
        self.learner_profiles: Dict[str, LearnerProfile] = {}
        
        logger.info(f"LoRAFineTuner initialized for {base_model_name} on {device}")
    
    @property
    def tokenizer(self):
        """Lazy load tokenizer"""
        if self._tokenizer is None:
            tf = _load_transformers()
            self._tokenizer = tf.AutoTokenizer.from_pretrained(
                self.base_model_name,
                cache_dir=self.cache_dir
            )
            self._tokenizer.pad_token = self._tokenizer.eos_token
        return self._tokenizer
    
    @property
    def base_model(self):
        """Lazy load base model"""
        if self._base_model is None:
            tf = _load_transformers()
            self._base_model = tf.AutoModelForCausalLM.from_pretrained(
                self.base_model_name,
                torch_dtype=torch.float16 if self.device.type == "cuda" else torch.float32,
                device_map="auto" if self.device.type == "cuda" else None,
                cache_dir=self.cache_dir
            )
            logger.info(f"Loaded base model: {self.base_model_name}")
        return self._base_model
    
    @property
    def lora_config(self):
        """Get LoRA configuration"""
        if self._lora_config is None:
            peft_lib = _load_peft()
            self._lora_config = peft_lib.LoraConfig(
                task_type=peft_lib.TaskType.CAUSAL_LM,
                r=self.lora_r,
                lora_alpha=self.lora_alpha,
                lora_dropout=self.lora_dropout,
                target_modules=["q_proj", "v_proj"],  # Which layers to adapt
                bias="none",
                inference_mode=False
            )
        return self._lora_config
    
    def create_learner_adapter(
        self,
        learner_id: str,
        profile: LearnerProfile
    ) -> Any:
        """
        Create a LoRA adapter for a learner
        
        The adapter sits on top of the base model and personalizes outputs
        
        Args:
            learner_id: Unique learner identifier
            profile: Learner's profile for personalization
            
        Returns:
            PEFT model with LoRA adapter
        """
        peft_lib = _load_peft()
        
        # Create PEFT model with LoRA
        peft_model = peft_lib.get_peft_model(self.base_model, self.lora_config)
        
        # Cache adapter and profile
        self.learner_adapters[learner_id] = peft_model
        self.learner_profiles[learner_id] = profile
        
        trainable_params = sum(p.numel() for p in peft_model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in peft_model.parameters())
        
        logger.info(
            f"Created LoRA adapter for {learner_id}: "
            f"{trainable_params:,} trainable / {total_params:,} total params "
            f"({trainable_params/total_params*100:.2f}%)"
        )
        
        return peft_model
    
    def prepare_training_data(
        self,
        examples: List[FineTuningExample],
        profile: LearnerProfile
    ) -> Any:
        """
        Prepare training data with learner-specific formatting
        
        Format:
        <|system|>You are a helpful tutor for [grade] grade. The student learns best with [style] explanations.<|user|>[prompt]<|assistant|>[response]
        
        Args:
            examples: List of training examples
            profile: Learner profile for context
            
        Returns:
            HuggingFace Dataset ready for training
        """
        datasets = _load_datasets()
        formatted_examples = []
        
        # System prompt based on profile
        system_prompt = self._create_system_prompt(profile)
        
        for example in examples:
            text = (
                f"<|system|>{system_prompt}\n"
                f"<|user|>{example.prompt}\n"
                f"<|assistant|>{example.response}"
            )
            formatted_examples.append({"text": text})
        
        return datasets.Dataset.from_list(formatted_examples)
    
    def _create_system_prompt(self, profile: LearnerProfile) -> str:
        """
        Create personalized system prompt based on learner profile
        
        Args:
            profile: Learner profile
            
        Returns:
            System prompt string
        """
        prompt_parts = [
            f"You are a helpful tutor for a {profile.grade_level}th grade student.",
            f"The student's reading level is {profile.reading_level} grade level.",
            f"The student learns best with {profile.learning_style} explanations.",
        ]
        
        if profile.strengths:
            prompt_parts.append(
                f"Student's strengths: {', '.join(profile.strengths[:3])}."
            )
        
        if profile.challenges:
            prompt_parts.append(
                f"Areas for growth: {', '.join(profile.challenges[:3])}."
            )
        
        if profile.iep_goals:
            prompt_parts.append(
                f"Focus on these learning goals: {', '.join(profile.iep_goals[:2])}."
            )
        
        if profile.accessibility_needs:
            prompt_parts.append(
                f"Accessibility considerations: {', '.join(profile.accessibility_needs[:2])}."
            )
        
        prompt_parts.append(
            "Always use encouraging language and break complex topics into simple steps."
        )
        
        return " ".join(prompt_parts)
    
    def fine_tune(
        self,
        learner_id: str,
        profile: LearnerProfile,
        examples: List[FineTuningExample],
        num_epochs: int = 3,
        batch_size: int = 4,
        learning_rate: float = 3e-4,
        output_dir: str = "models/lora_adapters",
        config: Optional[FineTuningConfig] = None
    ) -> TrainingMetrics:
        """
        Fine-tune LoRA adapter on learner-specific examples
        
        Args:
            learner_id: Learner identifier
            profile: Learner profile
            examples: Training examples
            num_epochs: Training epochs (default: 3)
            batch_size: Batch size (default: 4)
            learning_rate: Learning rate (default: 3e-4)
            output_dir: Directory to save adapter
            config: Optional full configuration
        
        Returns:
            Training metrics
        """
        import time
        tf = _load_transformers()
        
        start_time = time.time()
        
        # Use config if provided
        if config:
            num_epochs = config.num_epochs
            batch_size = config.batch_size
            learning_rate = config.learning_rate
        
        # Create adapter if doesn't exist
        if learner_id not in self.learner_adapters:
            self.create_learner_adapter(learner_id, profile)
        
        model = self.learner_adapters[learner_id]
        
        # Prepare dataset
        dataset = self.prepare_training_data(examples, profile)
        
        # Tokenize
        max_length = config.max_length if config else 512
        
        def tokenize_function(batch):
            return self.tokenizer(
                batch["text"],
                truncation=True,
                max_length=max_length,
                padding="max_length"
            )
        
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=dataset.column_names
        )
        
        # Training arguments
        warmup_steps = config.warmup_steps if config else 50
        logging_steps = config.logging_steps if config else 10
        save_strategy = config.save_strategy if config else "epoch"
        
        adapter_output_dir = f"{output_dir}/{learner_id}"
        os.makedirs(adapter_output_dir, exist_ok=True)
        
        training_args = tf.TrainingArguments(
            output_dir=adapter_output_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=batch_size,
            learning_rate=learning_rate,
            warmup_steps=warmup_steps,
            logging_steps=logging_steps,
            save_strategy=save_strategy,
            fp16=self.device.type == "cuda",
            report_to="none",
            logging_dir=f"{adapter_output_dir}/logs"
        )
        
        # Data collator
        data_collator = tf.DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False
        )
        
        # Trainer
        trainer = tf.Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_dataset,
            data_collator=data_collator
        )
        
        # Train
        logger.info(f"Starting fine-tuning for {learner_id} with {len(examples)} examples")
        train_result = trainer.train()
        
        # Save adapter
        model.save_pretrained(adapter_output_dir)
        
        # Save profile alongside adapter
        profile_path = Path(adapter_output_dir) / "profile.json"
        with open(profile_path, "w") as f:
            json.dump(profile.to_dict(), f, indent=2)
        
        training_time = time.time() - start_time
        
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in model.parameters())
        
        metrics = TrainingMetrics(
            train_loss=train_result.training_loss,
            epochs=num_epochs,
            examples_count=len(examples),
            trainable_params=trainable_params,
            total_params=total_params,
            training_time_seconds=training_time
        )
        
        logger.info(
            f"Fine-tuning complete for {learner_id}: "
            f"loss={metrics.train_loss:.4f}, "
            f"time={training_time:.1f}s, "
            f"trainable={metrics.trainable_percentage:.2f}%"
        )
        
        return metrics
    
    def load_learner_adapter(
        self,
        learner_id: str,
        adapter_path: str
    ) -> bool:
        """
        Load a previously trained adapter
        
        Args:
            learner_id: Learner identifier
            adapter_path: Path to saved adapter
            
        Returns:
            True if successful
        """
        peft_lib = _load_peft()
        
        try:
            model = peft_lib.PeftModel.from_pretrained(
                self.base_model,
                adapter_path,
                is_trainable=False
            )
            self.learner_adapters[learner_id] = model
            
            # Load profile if exists
            profile_path = Path(adapter_path) / "profile.json"
            if profile_path.exists():
                with open(profile_path) as f:
                    profile_data = json.load(f)
                    self.learner_profiles[learner_id] = LearnerProfile.from_dict(profile_data)
            
            logger.info(f"Loaded adapter for {learner_id} from {adapter_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load adapter for {learner_id}: {e}")
            return False
    
    def unload_learner_adapter(self, learner_id: str) -> bool:
        """
        Unload a learner adapter to free memory
        
        Args:
            learner_id: Learner identifier
            
        Returns:
            True if adapter was unloaded
        """
        if learner_id in self.learner_adapters:
            del self.learner_adapters[learner_id]
            if learner_id in self.learner_profiles:
                del self.learner_profiles[learner_id]
            logger.info(f"Unloaded adapter for {learner_id}")
            return True
        return False
    
    def generate(
        self,
        learner_id: str,
        prompt: str,
        max_length: int = 200,
        temperature: float = 0.7,
        top_p: float = 0.9,
        include_system_prompt: bool = True
    ) -> str:
        """
        Generate personalized response for a learner
        
        Args:
            learner_id: Learner identifier
            prompt: Input prompt
            max_length: Max tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            top_p: Nucleus sampling threshold
            include_system_prompt: Whether to include personalized system prompt
        
        Returns:
            Generated response
        """
        # Get learner's adapter or fall back to base model
        if learner_id in self.learner_adapters:
            model = self.learner_adapters[learner_id]
            profile = self.learner_profiles.get(learner_id)
        else:
            model = self.base_model
            profile = None
        
        # Build input with optional system prompt
        if include_system_prompt and profile:
            system_prompt = self._create_system_prompt(profile)
            input_text = (
                f"<|system|>{system_prompt}\n"
                f"<|user|>{prompt}\n"
                f"<|assistant|>"
            )
        else:
            input_text = f"<|user|>{prompt}\n<|assistant|>"
        
        # Tokenize input
        inputs = self.tokenizer(
            input_text,
            return_tensors="pt"
        ).to(self.device)
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
        
        # Decode
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract assistant response
        if "<|assistant|>" in response:
            response = response.split("<|assistant|>")[-1].strip()
        
        return response
    
    def generate_with_context(
        self,
        learner_id: str,
        prompt: str,
        context: str,
        max_length: int = 300
    ) -> str:
        """
        Generate response with additional context (e.g., lesson content)
        
        Args:
            learner_id: Learner identifier
            prompt: User question
            context: Additional context (lesson content, etc.)
            max_length: Max tokens to generate
            
        Returns:
            Generated response
        """
        full_prompt = f"Context: {context}\n\nQuestion: {prompt}"
        return self.generate(learner_id, full_prompt, max_length=max_length)
    
    def compare_responses(
        self,
        learner_ids: List[str],
        prompt: str
    ) -> Dict[str, str]:
        """
        Compare responses from different learner adapters
        
        Useful for debugging/evaluation
        
        Args:
            learner_ids: List of learner IDs to compare
            prompt: Input prompt
            
        Returns:
            Dictionary mapping learner_id to response
        """
        responses = {}
        
        # Base model response
        responses["base_model"] = self.generate(
            "base", 
            prompt, 
            include_system_prompt=False
        )
        
        # Learner-specific responses
        for learner_id in learner_ids:
            if learner_id in self.learner_adapters:
                responses[learner_id] = self.generate(learner_id, prompt)
        
        return responses
    
    def get_adapter_info(self, learner_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a learner's adapter
        
        Args:
            learner_id: Learner identifier
            
        Returns:
            Adapter information or None if not found
        """
        if learner_id not in self.learner_adapters:
            return None
        
        model = self.learner_adapters[learner_id]
        profile = self.learner_profiles.get(learner_id)
        
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in model.parameters())
        
        return {
            "learner_id": learner_id,
            "has_profile": profile is not None,
            "profile": profile.to_dict() if profile else None,
            "trainable_params": trainable_params,
            "total_params": total_params,
            "trainable_percentage": (trainable_params / total_params) * 100,
            "base_model": self.base_model_name,
            "lora_config": {
                "r": self.lora_r,
                "alpha": self.lora_alpha,
                "dropout": self.lora_dropout
            }
        }
    
    def list_loaded_adapters(self) -> List[str]:
        """List all currently loaded learner adapters"""
        return list(self.learner_adapters.keys())
    
    def save_all_adapters(self, output_dir: str = "models/lora_adapters"):
        """
        Save all loaded adapters to disk
        
        Args:
            output_dir: Base directory for saving
        """
        os.makedirs(output_dir, exist_ok=True)
        
        for learner_id, model in self.learner_adapters.items():
            adapter_path = f"{output_dir}/{learner_id}"
            model.save_pretrained(adapter_path)
            
            # Save profile if exists
            if learner_id in self.learner_profiles:
                profile_path = Path(adapter_path) / "profile.json"
                with open(profile_path, "w") as f:
                    json.dump(self.learner_profiles[learner_id].to_dict(), f, indent=2)
            
            logger.info(f"Saved adapter for {learner_id} to {adapter_path}")


# Example usage
if __name__ == "__main__":
    # Initialize fine-tuner
    tuner = LoRAFineTuner(device="cpu")
    
    # Create learner profile
    profile = LearnerProfile(
        learner_id="student_123",
        grade_level=5,
        reading_level="at",
        learning_style="visual",
        iep_goals=["Improve reading comprehension", "Build math fluency"],
        strengths=["Creative thinking", "Visual learning"],
        challenges=["Reading speed", "Math word problems"]
    )
    
    # Prepare training examples
    examples = [
        FineTuningExample(
            prompt="What is photosynthesis?",
            response="Photosynthesis is how plants make food! Think of it like cooking with sunlight. Plants take in sunlight (their energy source), water from the soil, and carbon dioxide from the air. Then, like magic, they turn these into sugar (their food) and release oxygen that we breathe. It's like a super cool science recipe!"
        ),
        FineTuningExample(
            prompt="How do I solve 25 x 4?",
            response="Great question! Let's break this down into easy steps:\n\n1. First, think of 25 as 'quarters' (like 25 cents)\n2. If you have 4 quarters, that's $1.00 = 100 cents\n3. So 25 x 4 = 100!\n\nHere's another way:\n25 x 4 = (20 x 4) + (5 x 4)\n       = 80 + 20\n       = 100\n\nYou did it! 🎉"
        ),
        FineTuningExample(
            prompt="I don't understand fractions",
            response="No worries! Let's use pictures to help.\n\nImagine a pizza 🍕:\n- If you cut it into 4 equal slices and eat 1, you ate 1/4 (one-fourth)\n- If you eat 2 slices, you ate 2/4 (two-fourths)\n- If you eat all 4 slices, you ate 4/4 = 1 whole pizza!\n\nThe bottom number (4) = how many pieces total\nThe top number (2) = how many pieces you have\n\nWhat fraction questions do you have? Let's practice together!"
        )
    ]
    
    print("LoRA Fine-Tuner initialized successfully!")
    print(f"Base model: {tuner.base_model_name}")
    print(f"Device: {tuner.device}")
    print(f"LoRA config: r={tuner.lora_r}, alpha={tuner.lora_alpha}")
    
    # Fine-tune (commented out for quick testing)
    # metrics = tuner.fine_tune(
    #     learner_id="student_123",
    #     profile=profile,
    #     examples=examples,
    #     num_epochs=3
    # )
    # print("Training metrics:", metrics)
    
    # Generate personalized response (requires adapter to be trained first)
    # response = tuner.generate(
    #     "student_123",
    #     "Can you help me understand what a fraction is?"
    # )
    # print("Personalized response:")
    # print(response)
