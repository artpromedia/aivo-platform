"""
Performance Optimization Utilities for Vision Analysis Service.

Provides utilities for:
- GPU batching for multiple images
- Model quantization for edge deployment
- Caching for frequently accessed results
- Async batch processing
- Memory-efficient image processing
"""

import asyncio
import hashlib
import logging
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar

import numpy as np

logger = logging.getLogger(__name__)

T = TypeVar('T')


# =============================================================================
# GPU Batching
# =============================================================================


@dataclass
class BatchConfig:
    """Configuration for batch processing."""
    max_batch_size: int = 8
    max_wait_time_ms: int = 100
    enable_dynamic_batching: bool = True
    preferred_batch_sizes: List[int] = field(
        default_factory=lambda: [1, 2, 4, 8]
    )


class BatchProcessor:
    """
    Process multiple images in GPU batches for improved throughput.

    Benefits:
    - Amortized GPU kernel launch overhead
    - Better GPU utilization
    - Higher throughput for concurrent requests

    Usage:
        processor = BatchProcessor(config, process_fn)
        results = await processor.process_batch(images)

        # Or for automatic batching:
        result = await processor.submit_single(image)
    """

    def __init__(
        self,
        config: Optional[BatchConfig] = None,
        process_fn: Optional[Callable] = None,
    ):
        """
        Initialize batch processor.

        Args:
            config: Batch processing configuration
            process_fn: Function to process a batch of images
        """
        self.config = config or BatchConfig()
        self.process_fn = process_fn
        self._pending_items: List[Tuple[np.ndarray, asyncio.Future]] = []
        self._lock = asyncio.Lock()
        self._batch_task: Optional[asyncio.Task] = None

    async def process_batch(
        self,
        images: List[np.ndarray],
        operation: str = "default",
    ) -> List[Any]:
        """
        Process multiple images in a single GPU batch.

        Args:
            images: List of images to process
            operation: Operation type for dispatching

        Returns:
            List of results, one per image
        """
        if not images:
            return []

        if self.process_fn is None:
            raise ValueError("No process function configured")

        # Pad batch to optimal size if dynamic batching enabled
        if self.config.enable_dynamic_batching:
            optimal_size = self._find_optimal_batch_size(len(images))
            if optimal_size > len(images):
                # Pad with copies of last image (will discard results)
                padding_count = optimal_size - len(images)
                images = images + [images[-1]] * padding_count

        start_time = time.time()

        # Stack images for batch processing
        # Assume images are same size or need resizing
        batch_array = self._prepare_batch(images)

        # Process batch
        try:
            results = await self._run_batch(batch_array, operation)
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            # Fall back to sequential processing
            results = []
            for img in images:
                try:
                    result = await self._run_single(img, operation)
                    results.append(result)
                except Exception as inner_e:
                    logger.warning(f"Single item failed: {inner_e}")
                    results.append(None)

        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.debug(
            f"Batch processed {len(images)} images in {elapsed_ms}ms "
            f"({elapsed_ms / len(images):.1f}ms/image)"
        )

        # Return only original results (not padding)
        return results[:len(images)]

    async def submit_single(
        self,
        image: np.ndarray,
        operation: str = "default",
    ) -> Any:
        """
        Submit single image for automatic batching.

        The image will be batched with other pending requests
        for efficient processing.

        Args:
            image: Image to process
            operation: Operation type

        Returns:
            Processing result
        """
        future: asyncio.Future = asyncio.get_event_loop().create_future()

        async with self._lock:
            self._pending_items.append((image, future))

            # Start batch processing task if not running
            if self._batch_task is None or self._batch_task.done():
                self._batch_task = asyncio.create_task(
                    self._process_pending_batch()
                )

        return await future

    async def _process_pending_batch(self):
        """Process pending items as a batch."""
        await asyncio.sleep(self.config.max_wait_time_ms / 1000)

        async with self._lock:
            if not self._pending_items:
                return

            items = self._pending_items[:self.config.max_batch_size]
            self._pending_items = self._pending_items[self.config.max_batch_size:]

        images = [item[0] for item in items]
        futures = [item[1] for item in items]

        try:
            results = await self.process_batch(images)
            for future, result in zip(futures, results):
                if not future.done():
                    future.set_result(result)
        except Exception as e:
            for future in futures:
                if not future.done():
                    future.set_exception(e)

    def _find_optimal_batch_size(self, count: int) -> int:
        """Find optimal batch size for given count."""
        for size in self.config.preferred_batch_sizes:
            if size >= count:
                return size
        return self.config.max_batch_size

    def _prepare_batch(self, images: List[np.ndarray]) -> np.ndarray:
        """Prepare images for batch processing."""
        if not images:
            return np.array([])

        # Find target size (use first image or resize all)
        target_h, target_w = images[0].shape[:2]

        # Resize images to same size
        import cv2
        resized = []
        for img in images:
            if img.shape[:2] != (target_h, target_w):
                img = cv2.resize(img, (target_w, target_h))
            resized.append(img)

        return np.stack(resized, axis=0)

    async def _run_batch(
        self,
        batch: np.ndarray,
        operation: str,
    ) -> List[Any]:
        """Run processing on batch."""
        if self.process_fn is None:
            raise ValueError("No process function configured")

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.process_fn(batch, operation)
        )

    async def _run_single(
        self,
        image: np.ndarray,
        operation: str,
    ) -> Any:
        """Process single image."""
        results = await self._run_batch(
            np.expand_dims(image, 0),
            operation
        )
        return results[0] if results else None


# =============================================================================
# Model Quantization
# =============================================================================


@dataclass
class QuantizationConfig:
    """Configuration for model quantization."""
    quantization_type: str = "int8"  # int8, float16, dynamic
    calibration_samples: int = 100
    enable_optimization: bool = True
    target_device: str = "cpu"  # cpu, cuda, edge


class ModelQuantizer:
    """
    Export quantized models for faster inference.

    Supports:
    - INT8 quantization for CPU
    - FP16 quantization for GPU
    - Dynamic quantization

    Usage:
        quantizer = ModelQuantizer(config)
        output_path = quantizer.export_quantized_model(model, "model_int8.onnx")
    """

    def __init__(self, config: Optional[QuantizationConfig] = None):
        """Initialize quantizer with configuration."""
        self.config = config or QuantizationConfig()

    def export_quantized_model(
        self,
        model_name: str,
        output_path: Optional[str] = None,
    ) -> str:
        """
        Export INT8 quantized model for faster inference.

        Args:
            model_name: Name of model to quantize
            output_path: Output path for quantized model

        Returns:
            Path to exported model
        """
        if output_path is None:
            output_path = f"{model_name}_{self.config.quantization_type}.onnx"

        logger.info(
            f"Quantizing model {model_name} to {self.config.quantization_type}"
        )

        # Placeholder for actual quantization logic
        # In production, would use torch.quantization, ONNX Runtime, or TensorRT

        try:
            if self.config.quantization_type == "int8":
                self._quantize_int8(model_name, output_path)
            elif self.config.quantization_type == "float16":
                self._quantize_fp16(model_name, output_path)
            else:
                self._quantize_dynamic(model_name, output_path)

            logger.info(f"Exported quantized model to {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Quantization failed: {e}")
            raise

    def _quantize_int8(self, model_name: str, output_path: str) -> None:
        """Perform INT8 quantization."""
        # Placeholder - would use actual quantization library
        logger.info(f"INT8 quantization for {model_name}")

    def _quantize_fp16(self, model_name: str, output_path: str) -> None:
        """Perform FP16 quantization."""
        logger.info(f"FP16 quantization for {model_name}")

    def _quantize_dynamic(self, model_name: str, output_path: str) -> None:
        """Perform dynamic quantization."""
        logger.info(f"Dynamic quantization for {model_name}")

    def get_quantization_report(self, original_model: str, quantized_model: str) -> Dict[str, Any]:
        """Get report comparing original and quantized model."""
        return {
            "original_model": original_model,
            "quantized_model": quantized_model,
            "quantization_type": self.config.quantization_type,
            "size_reduction_percent": 0.0,  # Would calculate actual reduction
            "speed_improvement_percent": 0.0,  # Would benchmark
            "accuracy_delta": 0.0,  # Would evaluate
        }


# =============================================================================
# Result Caching
# =============================================================================


class LRUCache:
    """
    LRU cache for vision analysis results.

    Caches results based on image hash to avoid redundant processing.
    Self-cleaning with configurable TTL.

    Usage:
        cache = LRUCache(max_size=100, ttl_seconds=900)
        cache.set(image_hash, result)
        cached = cache.get(image_hash)
    """

    def __init__(
        self,
        max_size: int = 100,
        ttl_seconds: int = 900,  # 15 minutes
    ):
        """
        Initialize LRU cache.

        Args:
            max_size: Maximum number of items to cache
            ttl_seconds: Time-to-live for cached items
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self._lock = asyncio.Lock()

    def _compute_key(self, image: np.ndarray) -> str:
        """Compute cache key from image."""
        return hashlib.md5(image.tobytes()).hexdigest()

    async def get(
        self,
        key: str,
        default: Optional[T] = None,
    ) -> Optional[T]:
        """
        Get cached result.

        Args:
            key: Cache key (image hash)
            default: Default value if not found

        Returns:
            Cached result or default
        """
        async with self._lock:
            if key not in self._cache:
                return default

            value, timestamp = self._cache[key]

            # Check TTL
            if time.time() - timestamp > self.ttl_seconds:
                del self._cache[key]
                return default

            # Move to end (most recently used)
            self._cache.move_to_end(key)
            return value

    async def set(self, key: str, value: Any) -> None:
        """
        Store result in cache.

        Args:
            key: Cache key
            value: Result to cache
        """
        async with self._lock:
            # Remove oldest if at capacity
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)

            self._cache[key] = (value, time.time())

    async def get_or_compute(
        self,
        image: np.ndarray,
        compute_fn: Callable[[np.ndarray], T],
    ) -> T:
        """
        Get cached result or compute if not found.

        Args:
            image: Input image
            compute_fn: Function to compute result

        Returns:
            Cached or computed result
        """
        key = self._compute_key(image)
        cached = await self.get(key)

        if cached is not None:
            logger.debug(f"Cache hit for {key[:8]}")
            return cached

        logger.debug(f"Cache miss for {key[:8]}, computing...")
        result = compute_fn(image)
        await self.set(key, result)
        return result

    async def clear(self) -> None:
        """Clear all cached items."""
        async with self._lock:
            self._cache.clear()

    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "ttl_seconds": self.ttl_seconds,
        }


# =============================================================================
# Memory-Efficient Image Processing
# =============================================================================


class ImageChunker:
    """
    Process large images in chunks to reduce memory usage.

    Useful for high-resolution scanned documents.

    Usage:
        chunker = ImageChunker(chunk_size=512, overlap=64)
        results = chunker.process_chunked(large_image, process_fn)
    """

    def __init__(
        self,
        chunk_size: int = 512,
        overlap: int = 64,
    ):
        """
        Initialize chunker.

        Args:
            chunk_size: Size of each chunk
            overlap: Overlap between chunks to avoid edge artifacts
        """
        self.chunk_size = chunk_size
        self.overlap = overlap

    def split_into_chunks(
        self,
        image: np.ndarray,
    ) -> List[Tuple[np.ndarray, Tuple[int, int]]]:
        """
        Split image into overlapping chunks.

        Args:
            image: Large image to split

        Returns:
            List of (chunk, (row_offset, col_offset)) tuples
        """
        h, w = image.shape[:2]
        stride = self.chunk_size - self.overlap
        chunks = []

        for row in range(0, h, stride):
            for col in range(0, w, stride):
                # Extract chunk with bounds checking
                end_row = min(row + self.chunk_size, h)
                end_col = min(col + self.chunk_size, w)

                chunk = image[row:end_row, col:end_col]
                chunks.append((chunk, (row, col)))

        return chunks

    def merge_results(
        self,
        results: List[Tuple[Any, Tuple[int, int]]],
        original_shape: Tuple[int, ...],
        merge_fn: Optional[Callable] = None,
    ) -> Any:
        """
        Merge chunk results back into full result.

        Args:
            results: List of (result, (row, col)) tuples
            original_shape: Original image shape
            merge_fn: Custom merge function

        Returns:
            Merged result
        """
        if merge_fn:
            return merge_fn(results, original_shape)

        # Default: concatenate string results
        text_results = []
        for result, (row, col) in sorted(results, key=lambda x: (x[1][0], x[1][1])):
            if isinstance(result, str):
                text_results.append(result)

        return " ".join(text_results)

    def process_chunked(
        self,
        image: np.ndarray,
        process_fn: Callable[[np.ndarray], Any],
        merge_fn: Optional[Callable] = None,
    ) -> Any:
        """
        Process large image in chunks.

        Args:
            image: Large image to process
            process_fn: Function to process each chunk
            merge_fn: Function to merge results

        Returns:
            Merged result
        """
        chunks = self.split_into_chunks(image)
        results = []

        for chunk, offset in chunks:
            result = process_fn(chunk)
            results.append((result, offset))

        return self.merge_results(results, image.shape, merge_fn)


# =============================================================================
# Async Batch Queue
# =============================================================================


class AsyncBatchQueue:
    """
    Async queue for batch processing with automatic batching.

    Accumulates requests and processes them in batches
    when either batch size is reached or timeout expires.

    Usage:
        queue = AsyncBatchQueue(batch_size=8, timeout_ms=100)
        await queue.start()
        result = await queue.submit(image)
        await queue.stop()
    """

    def __init__(
        self,
        process_fn: Callable[[List[np.ndarray]], List[Any]],
        batch_size: int = 8,
        timeout_ms: int = 100,
    ):
        """
        Initialize async batch queue.

        Args:
            process_fn: Function to process a batch
            batch_size: Maximum batch size
            timeout_ms: Max wait time before processing
        """
        self.process_fn = process_fn
        self.batch_size = batch_size
        self.timeout_ms = timeout_ms
        self._queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start the batch processing worker."""
        self._running = True
        self._worker_task = asyncio.create_task(self._worker())

    async def stop(self) -> None:
        """Stop the batch processing worker."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    async def submit(self, image: np.ndarray) -> Any:
        """
        Submit image for processing.

        Args:
            image: Image to process

        Returns:
            Processing result
        """
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        await self._queue.put((image, future))
        return await future

    async def _worker(self) -> None:
        """Background worker for batch processing."""
        while self._running:
            batch = []
            futures = []

            try:
                # Wait for first item
                item = await asyncio.wait_for(
                    self._queue.get(),
                    timeout=1.0
                )
                batch.append(item[0])
                futures.append(item[1])

                # Collect more items up to batch size
                deadline = time.time() + self.timeout_ms / 1000
                while len(batch) < self.batch_size:
                    remaining = deadline - time.time()
                    if remaining <= 0:
                        break
                    try:
                        item = await asyncio.wait_for(
                            self._queue.get(),
                            timeout=remaining
                        )
                        batch.append(item[0])
                        futures.append(item[1])
                    except asyncio.TimeoutError:
                        break

                # Process batch
                try:
                    results = self.process_fn(batch)
                    for future, result in zip(futures, results):
                        if not future.done():
                            future.set_result(result)
                except Exception as e:
                    for future in futures:
                        if not future.done():
                            future.set_exception(e)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break


# =============================================================================
# Factory Functions
# =============================================================================


def create_batch_processor(
    process_fn: Callable,
    max_batch_size: int = 8,
    max_wait_time_ms: int = 100,
) -> BatchProcessor:
    """Create a configured batch processor."""
    config = BatchConfig(
        max_batch_size=max_batch_size,
        max_wait_time_ms=max_wait_time_ms,
    )
    return BatchProcessor(config, process_fn)


def create_cache(
    max_size: int = 100,
    ttl_seconds: int = 900,
) -> LRUCache:
    """Create a configured LRU cache."""
    return LRUCache(max_size=max_size, ttl_seconds=ttl_seconds)


def create_chunker(
    chunk_size: int = 512,
    overlap: int = 64,
) -> ImageChunker:
    """Create a configured image chunker."""
    return ImageChunker(chunk_size=chunk_size, overlap=overlap)
