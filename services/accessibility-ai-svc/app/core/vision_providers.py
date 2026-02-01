"""
Multi-provider Vision/Image Analysis service.

Supports automatic failover between:
- BLIP (local)
- OpenAI GPT-4 Vision
- Google Cloud Vision
- Azure Computer Vision
- Anthropic Claude Vision
"""
import logging
import base64
import io
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

from ..core.config import get_config, VisionProvider, OCRProvider
from ..core.providers import MultiProviderManager

logger = logging.getLogger(__name__)


@dataclass
class CaptionResult:
    """Unified image caption result across providers."""
    caption: str
    confidence: float
    provider: str
    detailed_description: Optional[str] = None
    detected_objects: List[str] = field(default_factory=list)
    detected_labels: List[str] = field(default_factory=list)


@dataclass
class OCRResult:
    """Unified OCR result across providers."""
    text: str
    confidence: float
    provider: str
    regions: List[Dict[str, Any]] = field(default_factory=list)
    language: str = "en"


class MultiProviderVision:
    """
    Vision/Image Analysis with multi-provider support and automatic failover.
    
    Usage:
        vision = MultiProviderVision()
        result = vision.generate_caption(image_bytes)
    """
    
    def __init__(self):
        self.config = get_config()
        self._caption_manager = MultiProviderManager(
            name="Vision-Caption",
            enable_failover=self.config.enable_failover,
            max_retries=self.config.max_failover_attempts,
        )
        self._ocr_manager = MultiProviderManager(
            name="Vision-OCR",
            enable_failover=self.config.enable_failover,
            max_retries=self.config.max_failover_attempts,
        )
        self._setup_providers()
    
    def _setup_providers(self) -> None:
        """Register available providers."""
        # Caption providers
        caption_providers = self.config.get_available_vision_providers()
        for i, provider in enumerate(caption_providers):
            if provider == VisionProvider.BLIP_LOCAL:
                self._caption_manager.register_provider(
                    "blip_local",
                    self._caption_blip_local,
                    priority=i,
                )
            elif provider == VisionProvider.OPENAI_API:
                self._caption_manager.register_provider(
                    "openai_api",
                    self._caption_openai_api,
                    priority=i,
                )
            elif provider == VisionProvider.GOOGLE_CLOUD:
                self._caption_manager.register_provider(
                    "google_cloud",
                    self._caption_google_cloud,
                    priority=i,
                )
            elif provider == VisionProvider.AZURE:
                self._caption_manager.register_provider(
                    "azure",
                    self._caption_azure,
                    priority=i,
                )
            elif provider == VisionProvider.ANTHROPIC:
                self._caption_manager.register_provider(
                    "anthropic",
                    self._caption_anthropic,
                    priority=i,
                )
        
        # OCR providers
        ocr_providers = self.config.get_available_ocr_providers()
        for i, provider in enumerate(ocr_providers):
            if provider == OCRProvider.TESSERACT_LOCAL:
                self._ocr_manager.register_provider(
                    "tesseract_local",
                    self._ocr_tesseract_local,
                    priority=i,
                )
            elif provider == OCRProvider.GOOGLE_CLOUD:
                self._ocr_manager.register_provider(
                    "google_cloud",
                    self._ocr_google_cloud,
                    priority=i,
                )
            elif provider == OCRProvider.AZURE:
                self._ocr_manager.register_provider(
                    "azure",
                    self._ocr_azure,
                    priority=i,
                )
            elif provider == OCRProvider.AWS_TEXTRACT:
                self._ocr_manager.register_provider(
                    "aws_textract",
                    self._ocr_aws_textract,
                    priority=i,
                )
        
        logger.info(f"Vision caption providers: {self._caption_manager.get_available_providers()}")
        logger.info(f"Vision OCR providers: {self._ocr_manager.get_available_providers()}")
    
    def generate_caption(
        self,
        image: bytes,
        context: Optional[str] = None,
        preferred_provider: Optional[str] = None,
    ) -> CaptionResult:
        """
        Generate caption for image with automatic failover.
        
        Args:
            image: Raw image bytes
            context: Optional context about the image
            preferred_provider: Specific provider to try first
            
        Returns:
            CaptionResult with caption and metadata
        """
        result = self._caption_manager.execute(
            image=image,
            context=context,
            preferred_provider=preferred_provider,
        )
        
        if result.success and result.result:
            return result.result
        
        # Return empty result on failure
        logger.error(f"All Vision caption providers failed: {result.error}")
        return CaptionResult(
            caption="Unable to generate caption",
            confidence=0.0,
            provider="none",
        )
    
    def extract_text(
        self,
        image: bytes,
        language: str = "en",
        preferred_provider: Optional[str] = None,
    ) -> OCRResult:
        """
        Extract text from image with automatic failover.
        
        Args:
            image: Raw image bytes
            language: Expected language code
            preferred_provider: Specific provider to try first
            
        Returns:
            OCRResult with extracted text
        """
        result = self._ocr_manager.execute(
            image=image,
            language=language,
            preferred_provider=preferred_provider,
        )
        
        if result.success and result.result:
            return result.result
        
        # Return empty result on failure
        logger.error(f"All Vision OCR providers failed: {result.error}")
        return OCRResult(
            text="",
            confidence=0.0,
            provider="none",
            language=language,
        )
    
    def get_health(self) -> Dict[str, Any]:
        """Get health status of all providers."""
        return {
            "caption": self._caption_manager.get_health(),
            "ocr": self._ocr_manager.get_health(),
        }
    
    def _get_image_mime_type(self, image: bytes) -> str:
        """Detect image MIME type from magic bytes."""
        if image[:8] == b'\x89PNG\r\n\x1a\n':
            return "image/png"
        elif image[:2] == b'\xff\xd8':
            return "image/jpeg"
        elif image[:6] in (b'GIF87a', b'GIF89a'):
            return "image/gif"
        elif image[:4] == b'RIFF' and image[8:12] == b'WEBP':
            return "image/webp"
        return "image/jpeg"  # Default
    
    # ==================== Caption Provider Implementations ====================
    
    def _caption_blip_local(
        self,
        image: bytes,
        context: Optional[str] = None,
    ) -> CaptionResult:
        """Generate caption using local BLIP model."""
        from transformers import BlipProcessor, BlipForConditionalGeneration
        from PIL import Image
        
        # Load model
        processor = BlipProcessor.from_pretrained(self.config.blip_model_name)
        model = BlipForConditionalGeneration.from_pretrained(self.config.blip_model_name)
        
        # Load image
        pil_image = Image.open(io.BytesIO(image))
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Generate caption
        if context:
            # Conditional captioning
            inputs = processor(pil_image, context, return_tensors="pt")
        else:
            # Unconditional captioning
            inputs = processor(pil_image, return_tensors="pt")
        
        output = model.generate(**inputs, max_length=100)
        caption = processor.decode(output[0], skip_special_tokens=True)
        
        return CaptionResult(
            caption=caption,
            confidence=0.85,
            provider="blip_local",
        )
    
    def _caption_openai_api(
        self,
        image: bytes,
        context: Optional[str] = None,
    ) -> CaptionResult:
        """Generate caption using OpenAI GPT-4 Vision."""
        import httpx
        
        image_base64 = base64.b64encode(image).decode("utf-8")
        mime_type = self._get_image_mime_type(image)
        
        prompt = "Describe this image in detail for accessibility purposes."
        if context:
            prompt = f"Describe this image in the context of: {context}. Provide an accessibility-friendly description."
        
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.config.openai_api_key}"},
            json={
                "model": "gpt-4-vision-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_base64}",
                                },
                            },
                        ],
                    }
                ],
                "max_tokens": 500,
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        caption = data["choices"][0]["message"]["content"]
        
        return CaptionResult(
            caption=caption,
            confidence=0.95,
            provider="openai_api",
            detailed_description=caption,
        )
    
    def _caption_google_cloud(
        self,
        image: bytes,
        context: Optional[str] = None,
    ) -> CaptionResult:
        """Generate caption using Google Cloud Vision."""
        import httpx
        
        image_base64 = base64.b64encode(image).decode("utf-8")
        
        response = httpx.post(
            "https://vision.googleapis.com/v1/images:annotate",
            params={"key": self.config.google_cloud_key},
            json={
                "requests": [
                    {
                        "image": {"content": image_base64},
                        "features": [
                            {"type": "LABEL_DETECTION", "maxResults": 10},
                            {"type": "OBJECT_LOCALIZATION", "maxResults": 10},
                            {"type": "IMAGE_PROPERTIES"},
                        ],
                    }
                ]
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        result = data.get("responses", [{}])[0]
        
        # Extract labels
        labels = [
            label["description"]
            for label in result.get("labelAnnotations", [])
        ]
        
        # Extract objects
        objects = [
            obj["name"]
            for obj in result.get("localizedObjectAnnotations", [])
        ]
        
        # Build caption from detected elements
        if objects:
            caption = f"Image containing: {', '.join(objects[:5])}"
        elif labels:
            caption = f"Image showing: {', '.join(labels[:5])}"
        else:
            caption = "Image with no detected objects"
        
        return CaptionResult(
            caption=caption,
            confidence=0.85,
            provider="google_cloud",
            detected_objects=objects,
            detected_labels=labels,
        )
    
    def _caption_azure(
        self,
        image: bytes,
        context: Optional[str] = None,
    ) -> CaptionResult:
        """Generate caption using Azure Computer Vision."""
        import httpx
        
        endpoint = f"https://{self.config.azure_region}.api.cognitive.microsoft.com/vision/v3.2/analyze"
        
        response = httpx.post(
            endpoint,
            params={
                "visualFeatures": "Categories,Description,Objects,Tags",
                "language": "en",
            },
            headers={
                "Ocp-Apim-Subscription-Key": self.config.azure_key,
                "Content-Type": "application/octet-stream",
            },
            content=image,
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        # Get caption
        captions = data.get("description", {}).get("captions", [])
        caption = captions[0]["text"] if captions else "No caption generated"
        confidence = captions[0]["confidence"] if captions else 0.0
        
        # Get objects and tags
        objects = [obj["object"] for obj in data.get("objects", [])]
        tags = [tag["name"] for tag in data.get("tags", [])]
        
        return CaptionResult(
            caption=caption,
            confidence=confidence,
            provider="azure",
            detected_objects=objects,
            detected_labels=tags,
        )
    
    def _caption_anthropic(
        self,
        image: bytes,
        context: Optional[str] = None,
    ) -> CaptionResult:
        """Generate caption using Anthropic Claude Vision."""
        import httpx
        
        image_base64 = base64.b64encode(image).decode("utf-8")
        mime_type = self._get_image_mime_type(image)
        
        prompt = "Describe this image in detail for accessibility purposes. Provide a concise but complete description."
        if context:
            prompt = f"Describe this image in the context of: {context}. Provide an accessibility-friendly description."
        
        response = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.config.anthropic_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": "claude-3-sonnet-20240229",
                "max_tokens": 500,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": image_base64,
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        caption = data["content"][0]["text"]
        
        return CaptionResult(
            caption=caption,
            confidence=0.95,
            provider="anthropic",
            detailed_description=caption,
        )
    
    # ==================== OCR Provider Implementations ====================
    
    def _ocr_tesseract_local(
        self,
        image: bytes,
        language: str = "en",
    ) -> OCRResult:
        """Extract text using local Tesseract OCR."""
        import pytesseract
        from PIL import Image
        
        # Map language code
        lang_map = {
            "en": "eng",
            "es": "spa",
            "fr": "fra",
            "de": "deu",
            "zh": "chi_sim",
            "ja": "jpn",
        }
        tess_lang = lang_map.get(language, "eng")
        
        # Load image
        pil_image = Image.open(io.BytesIO(image))
        
        # Get detailed OCR data
        ocr_data = pytesseract.image_to_data(
            pil_image,
            lang=tess_lang,
            output_type=pytesseract.Output.DICT,
        )
        
        # Extract text and regions
        text_parts = []
        regions = []
        confidences = []
        
        for i in range(len(ocr_data['text'])):
            text = ocr_data['text'][i].strip()
            conf = int(ocr_data['conf'][i])
            
            if text and conf > 30:
                text_parts.append(text)
                confidences.append(conf / 100.0)
                regions.append({
                    "text": text,
                    "confidence": conf / 100.0,
                    "bounds": {
                        "x": ocr_data['left'][i],
                        "y": ocr_data['top'][i],
                        "width": ocr_data['width'][i],
                        "height": ocr_data['height'][i],
                    },
                })
        
        full_text = ' '.join(text_parts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return OCRResult(
            text=full_text,
            confidence=avg_confidence,
            provider="tesseract_local",
            regions=regions,
            language=language,
        )
    
    def _ocr_google_cloud(
        self,
        image: bytes,
        language: str = "en",
    ) -> OCRResult:
        """Extract text using Google Cloud Vision OCR."""
        import httpx
        
        image_base64 = base64.b64encode(image).decode("utf-8")
        
        response = httpx.post(
            "https://vision.googleapis.com/v1/images:annotate",
            params={"key": self.config.google_cloud_key},
            json={
                "requests": [
                    {
                        "image": {"content": image_base64},
                        "features": [{"type": "TEXT_DETECTION"}],
                        "imageContext": {
                            "languageHints": [language],
                        },
                    }
                ]
            },
            timeout=60.0,
        )
        
        response.raise_for_status()
        data = response.json()
        
        result = data.get("responses", [{}])[0]
        annotations = result.get("textAnnotations", [])
        
        if not annotations:
            return OCRResult(
                text="",
                confidence=0.0,
                provider="google_cloud",
                language=language,
            )
        
        # First annotation is the full text
        full_text = annotations[0].get("description", "")
        
        # Build regions from subsequent annotations
        regions = []
        for ann in annotations[1:]:
            vertices = ann.get("boundingPoly", {}).get("vertices", [])
            if len(vertices) >= 2:
                regions.append({
                    "text": ann.get("description", ""),
                    "confidence": 0.9,
                    "bounds": {
                        "x": vertices[0].get("x", 0),
                        "y": vertices[0].get("y", 0),
                        "width": vertices[1].get("x", 0) - vertices[0].get("x", 0),
                        "height": vertices[2].get("y", 0) - vertices[0].get("y", 0),
                    },
                })
        
        return OCRResult(
            text=full_text,
            confidence=0.95,
            provider="google_cloud",
            regions=regions,
            language=language,
        )
    
    def _ocr_azure(
        self,
        image: bytes,
        language: str = "en",
    ) -> OCRResult:
        """Extract text using Azure Computer Vision OCR."""
        import httpx
        
        endpoint = f"https://{self.config.azure_region}.api.cognitive.microsoft.com/vision/v3.2/read/analyze"
        
        # Submit image
        submit_response = httpx.post(
            endpoint,
            headers={
                "Ocp-Apim-Subscription-Key": self.config.azure_key,
                "Content-Type": "application/octet-stream",
            },
            content=image,
            timeout=60.0,
        )
        
        submit_response.raise_for_status()
        operation_url = submit_response.headers["Operation-Location"]
        
        # Poll for result
        import time
        while True:
            result_response = httpx.get(
                operation_url,
                headers={"Ocp-Apim-Subscription-Key": self.config.azure_key},
                timeout=30.0,
            )
            result_response.raise_for_status()
            result = result_response.json()
            
            if result["status"] == "succeeded":
                break
            elif result["status"] == "failed":
                raise Exception("Azure OCR failed")
            
            time.sleep(0.5)
        
        # Extract text
        text_parts = []
        regions = []
        
        for read_result in result.get("analyzeResult", {}).get("readResults", []):
            for line in read_result.get("lines", []):
                text_parts.append(line.get("text", ""))
                bbox = line.get("boundingBox", [0, 0, 0, 0, 0, 0, 0, 0])
                regions.append({
                    "text": line.get("text", ""),
                    "confidence": 0.9,
                    "bounds": {
                        "x": bbox[0] if len(bbox) > 0 else 0,
                        "y": bbox[1] if len(bbox) > 1 else 0,
                        "width": (bbox[2] - bbox[0]) if len(bbox) > 2 else 0,
                        "height": (bbox[5] - bbox[1]) if len(bbox) > 5 else 0,
                    },
                })
        
        return OCRResult(
            text="\n".join(text_parts),
            confidence=0.9,
            provider="azure",
            regions=regions,
            language=language,
        )
    
    def _ocr_aws_textract(
        self,
        image: bytes,
        language: str = "en",
    ) -> OCRResult:
        """Extract text using AWS Textract."""
        import boto3
        
        textract = boto3.client(
            "textract",
            aws_access_key_id=self.config.aws_access_key,
            aws_secret_access_key=self.config.aws_secret_key,
            region_name=self.config.aws_region,
        )
        
        response = textract.detect_document_text(
            Document={"Bytes": image}
        )
        
        text_parts = []
        regions = []
        confidences = []
        
        for block in response.get("Blocks", []):
            if block["BlockType"] == "LINE":
                text = block.get("Text", "")
                confidence = block.get("Confidence", 90) / 100.0
                
                text_parts.append(text)
                confidences.append(confidence)
                
                bbox = block.get("Geometry", {}).get("BoundingBox", {})
                regions.append({
                    "text": text,
                    "confidence": confidence,
                    "bounds": {
                        "x": int(bbox.get("Left", 0) * 1000),
                        "y": int(bbox.get("Top", 0) * 1000),
                        "width": int(bbox.get("Width", 0) * 1000),
                        "height": int(bbox.get("Height", 0) * 1000),
                    },
                })
        
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return OCRResult(
            text="\n".join(text_parts),
            confidence=avg_confidence,
            provider="aws_textract",
            regions=regions,
            language=language,
        )


# Singleton instance
_vision_instance: Optional[MultiProviderVision] = None


def get_multi_provider_vision() -> MultiProviderVision:
    """Get the singleton MultiProviderVision instance."""
    global _vision_instance
    if _vision_instance is None:
        _vision_instance = MultiProviderVision()
    return _vision_instance
