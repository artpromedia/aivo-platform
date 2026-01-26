"""
IEP Document Extraction Pipeline
Extracts structured data from IEP PDFs using OCR + NLP

This module implements a comprehensive extraction pipeline for Individualized Education
Programs (IEPs), converting unstructured PDF documents into actionable structured data.

Pipeline Architecture:
1. PDF Ingestion - Handle various PDF formats and quality levels
2. OCR Processing - Extract text from scanned documents
3. Text Cleaning - Normalize and clean extracted text
4. Section Detection - Identify IEP sections (goals, accommodations, services)
5. Entity Extraction - Extract specific data points using NLP
6. Validation - Verify extracted data meets expected schema
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import io
import logging
import json

# PDF Processing
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import pytesseract
    from PIL import Image
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

# NLP
try:
    import spacy
    HAS_SPACY = True
except ImportError:
    HAS_SPACY = False

try:
    from transformers import pipeline as hf_pipeline
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class IEPGoal:
    """
    Structured IEP goal with all components
    
    Attributes:
        goal_number: Unique identifier within the IEP (e.g., "1", "1.1")
        category: Goal category - academic, behavioral, or functional
        domain: Skill domain - reading, math, social, speech, etc.
        baseline: Current performance level
        target: Expected outcome/objective
        measurement: How progress will be measured
        timeline: When the goal should be achieved
        accommodations: Specific accommodations for this goal
        benchmarks: Short-term objectives/benchmarks
        progress_monitoring: How/when progress will be monitored
        raw_text: Original extracted text
        confidence: Extraction confidence score (0-1)
    """
    goal_number: str
    category: str  # academic, behavioral, functional
    domain: str  # reading, math, social, speech, motor, etc.
    baseline: str
    target: str
    measurement: str
    timeline: str
    accommodations: List[str] = field(default_factory=list)
    benchmarks: List[str] = field(default_factory=list)
    progress_monitoring: str = ""
    raw_text: str = ""
    confidence: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal_number": self.goal_number,
            "category": self.category,
            "domain": self.domain,
            "baseline": self.baseline,
            "target": self.target,
            "measurement": self.measurement,
            "timeline": self.timeline,
            "accommodations": self.accommodations,
            "benchmarks": self.benchmarks,
            "progress_monitoring": self.progress_monitoring,
            "confidence": self.confidence,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "IEPGoal":
        return cls(**{k: v for k, v in data.items() if k != "raw_text"})


@dataclass
class IEPAccommodation:
    """Structured accommodation or modification"""
    name: str
    category: str  # presentation, response, setting, timing, other
    description: str
    applies_to: List[str] = field(default_factory=list)  # subjects/contexts
    frequency: str = "as needed"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "applies_to": self.applies_to,
            "frequency": self.frequency,
        }


@dataclass
class IEPService:
    """Special education related service"""
    service_type: str  # speech, OT, PT, counseling, etc.
    provider: str
    minutes_per_week: int
    location: str  # general education, resource room, etc.
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    frequency: str = ""
    goals_addressed: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "service_type": self.service_type,
            "provider": self.provider,
            "minutes_per_week": self.minutes_per_week,
            "location": self.location,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "frequency": self.frequency,
            "goals_addressed": self.goals_addressed,
        }


@dataclass
class StudentInfo:
    """Student demographic and identification information"""
    name: str
    student_id: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    age: Optional[int] = None
    grade_level: Optional[str] = None
    school: Optional[str] = None
    district: Optional[str] = None
    disability_categories: List[str] = field(default_factory=list)
    eligibility_date: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "student_id": self.student_id,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "age": self.age,
            "grade_level": self.grade_level,
            "school": self.school,
            "district": self.district,
            "disability_categories": self.disability_categories,
            "eligibility_date": self.eligibility_date.isoformat() if self.eligibility_date else None,
        }


@dataclass
class IEPDocument:
    """
    Complete extracted IEP document structure
    
    Represents all extractable data from an IEP document,
    organized into logical sections matching the IEP structure.
    """
    # Student Information
    student: StudentInfo
    
    # Document Metadata
    iep_date: Optional[datetime] = None
    review_date: Optional[datetime] = None
    annual_review_date: Optional[datetime] = None
    triennial_date: Optional[datetime] = None
    
    # IEP Components
    goals: List[IEPGoal] = field(default_factory=list)
    accommodations: List[IEPAccommodation] = field(default_factory=list)
    modifications: List[IEPAccommodation] = field(default_factory=list)
    services: List[IEPService] = field(default_factory=list)
    
    # Placement
    placement: Optional[str] = None
    least_restrictive_environment: Optional[str] = None
    time_in_general_ed_percent: Optional[float] = None
    
    # Present Levels
    present_levels: Dict[str, str] = field(default_factory=dict)
    
    # Transition (for older students)
    transition_goals: List[str] = field(default_factory=list)
    post_secondary_goals: Dict[str, str] = field(default_factory=dict)
    
    # Team Members
    team_members: List[Dict[str, str]] = field(default_factory=list)
    
    # Extraction Metadata
    raw_text: str = ""
    extraction_confidence: float = 0.0
    extraction_warnings: List[str] = field(default_factory=list)
    page_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "student": self.student.to_dict(),
            "iep_date": self.iep_date.isoformat() if self.iep_date else None,
            "review_date": self.review_date.isoformat() if self.review_date else None,
            "annual_review_date": self.annual_review_date.isoformat() if self.annual_review_date else None,
            "goals": [g.to_dict() for g in self.goals],
            "accommodations": [a.to_dict() for a in self.accommodations],
            "modifications": [m.to_dict() for m in self.modifications],
            "services": [s.to_dict() for s in self.services],
            "placement": self.placement,
            "least_restrictive_environment": self.least_restrictive_environment,
            "time_in_general_ed_percent": self.time_in_general_ed_percent,
            "present_levels": self.present_levels,
            "transition_goals": self.transition_goals,
            "post_secondary_goals": self.post_secondary_goals,
            "team_members": self.team_members,
            "extraction_confidence": self.extraction_confidence,
            "extraction_warnings": self.extraction_warnings,
            "page_count": self.page_count,
        }
    
    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


class IEPExtractor:
    """
    Extracts structured data from IEP PDFs using OCR + NLP
    
    Pipeline:
    1. PDF -> Images (PyMuPDF)
    2. OCR (Tesseract) for scanned documents
    3. Text cleaning and normalization
    4. Section detection and splitting
    5. NLP extraction (spaCy + transformers)
    6. Entity recognition and linking
    7. Structure validation and confidence scoring
    
    Example:
        >>> extractor = IEPExtractor()
        >>> iep_doc = extractor.extract_from_pdf("student_iep.pdf")
        >>> print(iep_doc.to_json())
    """
    
    # Common disability categories in IDEA
    DISABILITY_CATEGORIES = [
        "Autism", "Autism Spectrum Disorder", "ASD",
        "Specific Learning Disability", "SLD", "Learning Disability",
        "Attention Deficit Hyperactivity Disorder", "ADHD", "ADD",
        "Emotional Disturbance", "ED", "Emotional Behavioral Disorder",
        "Speech or Language Impairment", "SLI", "Speech Impairment",
        "Intellectual Disability", "ID", "Cognitive Impairment",
        "Other Health Impairment", "OHI",
        "Orthopedic Impairment", "OI", "Physical Disability",
        "Visual Impairment", "VI", "Blindness",
        "Hearing Impairment", "HI", "Deafness",
        "Deaf-Blindness",
        "Multiple Disabilities",
        "Traumatic Brain Injury", "TBI",
        "Developmental Delay", "DD",
    ]
    
    # Goal domain keywords
    DOMAIN_KEYWORDS = {
        'reading': [
            'reading', 'comprehension', 'decoding', 'fluency', 'phonics',
            'phonemic awareness', 'vocabulary', 'sight words', 'lexile'
        ],
        'math': [
            'math', 'mathematics', 'computation', 'problem solving', 'numeracy',
            'arithmetic', 'calculation', 'number sense', 'algebra', 'geometry'
        ],
        'writing': [
            'writing', 'composition', 'handwriting', 'spelling', 'grammar',
            'written expression', 'sentence structure', 'paragraph'
        ],
        'speech': [
            'speech', 'articulation', 'language', 'communication', 'expressive',
            'receptive', 'phonology', 'fluency', 'stuttering', 'pragmatic'
        ],
        'social': [
            'social', 'peer interaction', 'conversation', 'pragmatic',
            'social skills', 'friendship', 'cooperation', 'turn-taking'
        ],
        'behavioral': [
            'behavior', 'conduct', 'self-regulation', 'impulse control',
            'attention', 'on-task', 'compliance', 'following directions'
        ],
        'motor': [
            'motor', 'fine motor', 'gross motor', 'coordination', 'handwriting',
            'cutting', 'grip', 'balance', 'physical'
        ],
        'adaptive': [
            'adaptive', 'daily living', 'self-care', 'independence',
            'functional', 'life skills', 'self-help'
        ],
        'executive_function': [
            'executive function', 'organization', 'planning', 'time management',
            'working memory', 'task initiation', 'flexibility'
        ],
    }
    
    # Accommodation categories
    ACCOMMODATION_CATEGORIES = {
        'presentation': [
            'read aloud', 'audio', 'large print', 'braille', 'simplified language',
            'visual supports', 'graphic organizer', 'highlighted text'
        ],
        'response': [
            'scribe', 'speech-to-text', 'word processor', 'calculator',
            'spell check', 'verbal response', 'pointing'
        ],
        'setting': [
            'preferential seating', 'small group', 'separate location',
            'reduced distractions', 'special lighting', 'quiet space'
        ],
        'timing': [
            'extended time', 'breaks', 'multiple sessions', 'flexible scheduling',
            'time and a half', 'double time'
        ],
    }
    
    def __init__(
        self, 
        spacy_model: str = "en_core_web_sm",
        use_transformers: bool = True,
        ocr_dpi: int = 300,
        min_text_threshold: int = 100
    ):
        """
        Initialize IEP Extractor
        
        Args:
            spacy_model: spaCy model to use for NLP
            use_transformers: Whether to use transformer models for enhanced NER
            ocr_dpi: DPI for OCR rendering
            min_text_threshold: Minimum characters before triggering OCR
        """
        self.ocr_dpi = ocr_dpi
        self.min_text_threshold = min_text_threshold
        self.use_transformers = use_transformers
        
        # Load spaCy model
        self.nlp = None
        if HAS_SPACY:
            try:
                self.nlp = spacy.load(spacy_model)
                logger.info(f"Loaded spaCy model: {spacy_model}")
            except OSError:
                logger.warning(f"spaCy model {spacy_model} not found. NER will be limited.")
        
        # Load transformer NER model
        self.ner_pipeline = None
        if use_transformers and HAS_TRANSFORMERS:
            try:
                self.ner_pipeline = hf_pipeline(
                    "ner",
                    model="dslim/bert-base-NER",
                    aggregation_strategy="simple"
                )
                logger.info("Loaded transformer NER model")
            except Exception as e:
                logger.warning(f"Could not load transformer NER: {e}")
        
        # Compile regex patterns
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for extraction"""
        self.patterns = {
            # Goal patterns
            'goal_header': re.compile(
                r'(?:Annual\s+)?Goal\s*[#:]?\s*(\d+(?:\.\d+)?):?\s*([^\n]+)',
                re.IGNORECASE
            ),
            'objective_header': re.compile(
                r'(?:Short[- ]term\s+)?Objective\s*[#:]?\s*(\d+(?:\.\d+)?):?\s*([^\n]+)',
                re.IGNORECASE
            ),
            
            # Baseline/Present Level patterns
            'baseline': re.compile(
                r'(?:Current\s+Level|Baseline|Present\s+Levels?|PLOP|PLAAFP)[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]*)*)',
                re.IGNORECASE
            ),
            
            # Target/Objective patterns  
            'target': re.compile(
                r'(?:Goal|Target|Objective|Expected\s+Outcome)[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]*)*)',
                re.IGNORECASE
            ),
            
            # Measurement patterns
            'measurement': re.compile(
                r'(?:Measured\s+by|Assessment|Evaluation\s+Method|Progress\s+Monitoring|Criteria)[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]*)*)',
                re.IGNORECASE
            ),
            
            # Date patterns
            'date_mdy': re.compile(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})'),
            'date_written': re.compile(
                r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
                re.IGNORECASE
            ),
            
            # Student info patterns
            'grade': re.compile(r'Grade[:\s]+(\d+|K|PK|Pre-?K|Kindergarten)', re.IGNORECASE),
            'dob': re.compile(r'(?:DOB|Date\s+of\s+Birth|Birth\s*date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', re.IGNORECASE),
            'student_id': re.compile(r'(?:Student\s+ID|ID\s*#?|Student\s*#)[:\s]+([A-Z0-9]+)', re.IGNORECASE),
            
            # Service patterns
            'service_minutes': re.compile(
                r'(Speech|Occupational|Physical|Counseling|Psychology|Special\s+Education|Resource|ESL)\s*'
                r'(?:Therapy|Services?)?[:\s]*(\d+)\s*(?:minutes?|mins?)\s*(?:per|/)\s*(?:week|session)',
                re.IGNORECASE
            ),
            
            # Percentage patterns
            'percentage': re.compile(r'(\d{1,3})%'),
            
            # Time patterns
            'time_minutes': re.compile(r'(\d+)\s*(?:minutes?|mins?)'),
        }
    
    def extract_from_pdf(
        self, 
        pdf_path: str,
        validate: bool = True
    ) -> IEPDocument:
        """
        Extract IEP data from PDF file
        
        Args:
            pdf_path: Path to PDF file
            validate: Whether to validate extracted data
        
        Returns:
            Extracted IEP document structure
        """
        if not Path(pdf_path).exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Step 1: Extract text from PDF
        raw_text, page_count = self._extract_text_from_pdf(pdf_path)
        
        # Step 2: Initialize document
        iep_doc = IEPDocument(
            student=StudentInfo(name=""),
            raw_text=raw_text,
            page_count=page_count,
        )
        
        # Step 3: Extract student information
        self._extract_student_info(iep_doc, raw_text)
        
        # Step 4: Extract dates
        self._extract_dates(iep_doc, raw_text)
        
        # Step 5: Extract goals
        self._extract_goals(iep_doc, raw_text)
        
        # Step 6: Extract accommodations
        self._extract_accommodations(iep_doc, raw_text)
        
        # Step 7: Extract services
        self._extract_services(iep_doc, raw_text)
        
        # Step 8: Extract placement information
        self._extract_placement(iep_doc, raw_text)
        
        # Step 9: Extract present levels
        self._extract_present_levels(iep_doc, raw_text)
        
        # Step 10: Calculate confidence score
        self._calculate_confidence(iep_doc)
        
        # Step 11: Validate if requested
        if validate:
            self._validate_extraction(iep_doc)
        
        logger.info(
            f"Extracted IEP: {len(iep_doc.goals)} goals, "
            f"{len(iep_doc.accommodations)} accommodations, "
            f"{len(iep_doc.services)} services, "
            f"confidence: {iep_doc.extraction_confidence:.2f}"
        )
        
        return iep_doc
    
    def extract_from_bytes(
        self, 
        pdf_bytes: bytes,
        validate: bool = True
    ) -> IEPDocument:
        """Extract IEP data from PDF bytes (for API uploads)"""
        import tempfile
        
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        
        try:
            return self.extract_from_pdf(tmp_path, validate)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    
    def _extract_text_from_pdf(self, pdf_path: str) -> Tuple[str, int]:
        """
        Extract text from PDF using PyMuPDF + OCR fallback
        
        Returns:
            Tuple of (extracted_text, page_count)
        """
        if not HAS_PYMUPDF:
            raise ImportError("PyMuPDF (fitz) is required for PDF processing")
        
        text_blocks = []
        
        try:
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            
            for page_num in range(page_count):
                page = doc[page_num]
                
                # Try native text extraction first
                page_text = page.get_text("text")
                
                # If text is sparse, use OCR
                if len(page_text.strip()) < self.min_text_threshold and HAS_TESSERACT:
                    logger.debug(f"Using OCR for page {page_num + 1}")
                    page_text = self._ocr_page(page)
                
                text_blocks.append(f"--- Page {page_num + 1} ---\n{page_text}")
            
            doc.close()
            
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            raise ValueError(f"Failed to extract text from PDF: {e}")
        
        return "\n\n".join(text_blocks), page_count
    
    def _ocr_page(self, page) -> str:
        """OCR a single PDF page"""
        if not HAS_TESSERACT:
            return ""
        
        try:
            # Render page to image
            pix = page.get_pixmap(dpi=self.ocr_dpi)
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # OCR with Tesseract
            text = pytesseract.image_to_string(
                img,
                config='--psm 6'  # Assume uniform block of text
            )
            
            return text
            
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return ""
    
    def _extract_student_info(self, iep_doc: IEPDocument, text: str):
        """Extract student demographic information"""
        # Process first portion of document (usually contains student info)
        header_text = text[:5000]
        
        # Extract name using NER
        if self.nlp:
            doc = self.nlp(header_text[:3000])
            persons = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
            if persons:
                # First person entity is usually the student
                iep_doc.student.name = persons[0]
        
        # Also try transformer NER if available
        if self.ner_pipeline and not iep_doc.student.name:
            try:
                entities = self.ner_pipeline(header_text[:1000])
                persons = [e['word'] for e in entities if e['entity_group'] == 'PER']
                if persons:
                    iep_doc.student.name = persons[0]
            except Exception:
                pass
        
        # Extract student ID
        id_match = self.patterns['student_id'].search(header_text)
        if id_match:
            iep_doc.student.student_id = id_match.group(1)
        
        # Extract date of birth
        dob_match = self.patterns['dob'].search(header_text)
        if dob_match:
            iep_doc.student.date_of_birth = self._parse_date(dob_match.group(1))
        
        # Extract grade level
        grade_match = self.patterns['grade'].search(header_text)
        if grade_match:
            grade = grade_match.group(1)
            # Normalize grade
            if grade.lower() in ['k', 'kindergarten']:
                grade = 'K'
            elif grade.lower() in ['pk', 'pre-k', 'prek']:
                grade = 'PK'
            iep_doc.student.grade_level = grade
        
        # Extract disability category
        text_lower = text.lower()
        found_disabilities = []
        for disability in self.DISABILITY_CATEGORIES:
            if disability.lower() in text_lower:
                # Avoid duplicates and abbreviations if full name found
                if not any(d.startswith(disability) or disability.startswith(d) 
                          for d in found_disabilities):
                    found_disabilities.append(disability)
        
        iep_doc.student.disability_categories = found_disabilities[:3]  # Top 3
        
        # Extract school name
        school_patterns = [
            r'School[:\s]+([A-Z][A-Za-z\s]+(?:Elementary|Middle|High|School))',
            r'([A-Z][A-Za-z\s]+(?:Elementary|Middle|High)\s+School)',
        ]
        for pattern in school_patterns:
            match = re.search(pattern, header_text)
            if match:
                iep_doc.student.school = match.group(1).strip()
                break
    
    def _extract_dates(self, iep_doc: IEPDocument, text: str):
        """Extract IEP-related dates"""
        header_text = text[:3000]
        
        # Look for specific date labels
        date_labels = {
            'iep_date': ['IEP Date', 'Meeting Date', 'IEP Meeting'],
            'review_date': ['Review Date', 'Next Review'],
            'annual_review_date': ['Annual Review', 'Annual IEP'],
        }
        
        for attr, labels in date_labels.items():
            for label in labels:
                pattern = rf'{label}[:\s]+(\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{2,4}})'
                match = re.search(pattern, header_text, re.IGNORECASE)
                if match:
                    date = self._parse_date(match.group(1))
                    if date:
                        setattr(iep_doc, attr, date)
                        break
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string to datetime"""
        formats = [
            '%m/%d/%Y', '%m-%d-%Y', '%m/%d/%y', '%m-%d-%y',
            '%Y-%m-%d', '%d/%m/%Y',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        return None
    
    def _extract_goals(self, iep_doc: IEPDocument, text: str):
        """Extract IEP goals from text"""
        # Split text into potential goal sections
        sections = self._split_into_goal_sections(text)
        
        for section in sections:
            goal = self._parse_goal_section(section)
            if goal:
                iep_doc.goals.append(goal)
        
        # If no goals found with headers, try alternative extraction
        if not iep_doc.goals:
            self._extract_goals_alternative(iep_doc, text)
    
    def _split_into_goal_sections(self, text: str) -> List[str]:
        """Split document into goal sections"""
        # Split on goal headers
        goal_patterns = [
            r'(?=\n\s*(?:Annual\s+)?Goal\s*[#:]?\s*\d)',
            r'(?=\n\s*GOAL\s*[#:]?\s*\d)',
            r'(?=\n\s*IEP\s+Goal\s*[#:]?\s*\d)',
        ]
        
        sections = [text]
        for pattern in goal_patterns:
            new_sections = []
            for section in sections:
                parts = re.split(pattern, section, flags=re.IGNORECASE)
                new_sections.extend(parts)
            sections = new_sections
        
        # Filter to meaningful sections
        return [s for s in sections if len(s.strip()) > 100]
    
    def _parse_goal_section(self, section: str) -> Optional[IEPGoal]:
        """Parse a single goal section"""
        # Extract goal number and title
        goal_match = self.patterns['goal_header'].search(section)
        if not goal_match:
            return None
        
        goal_number = goal_match.group(1)
        goal_title = goal_match.group(2).strip()
        
        # Extract baseline
        baseline = ""
        baseline_match = self.patterns['baseline'].search(section)
        if baseline_match:
            baseline = self._clean_text(baseline_match.group(1))
        
        # Extract target/objective
        target = goal_title
        target_match = self.patterns['target'].search(section)
        if target_match:
            target = self._clean_text(target_match.group(1))
        
        # Extract measurement criteria
        measurement = self._extract_measurement(section)
        
        # Extract timeline
        timeline = self._extract_timeline(section)
        
        # Classify domain and category
        domain = self._classify_goal_domain(section)
        category = self._classify_goal_category(section)
        
        # Extract benchmarks/objectives
        benchmarks = self._extract_benchmarks(section)
        
        # Calculate confidence
        confidence = self._calculate_goal_confidence(
            baseline=baseline,
            target=target,
            measurement=measurement,
            timeline=timeline
        )
        
        return IEPGoal(
            goal_number=goal_number,
            category=category,
            domain=domain,
            baseline=baseline[:500],  # Limit length
            target=target[:500],
            measurement=measurement,
            timeline=timeline,
            benchmarks=benchmarks,
            raw_text=section[:1000],
            confidence=confidence,
        )
    
    def _extract_goals_alternative(self, iep_doc: IEPDocument, text: str):
        """Alternative goal extraction when headers not found"""
        # Look for numbered items in goal-like sections
        goal_section = self._find_section(text, ['goals', 'objectives', 'measurable goals'])
        if not goal_section:
            return
        
        # Extract numbered items
        numbered_pattern = r'(\d+)\.\s+([^\n]+(?:\n(?!\d+\.)[^\n]*)*)'
        matches = re.findall(numbered_pattern, goal_section, re.MULTILINE)
        
        for num, content in matches:
            domain = self._classify_goal_domain(content)
            category = self._classify_goal_category(content)
            
            goal = IEPGoal(
                goal_number=num,
                category=category,
                domain=domain,
                baseline="",
                target=self._clean_text(content)[:500],
                measurement=self._extract_measurement(content),
                timeline=self._extract_timeline(content),
                confidence=0.5,  # Lower confidence for alternative extraction
            )
            iep_doc.goals.append(goal)
    
    def _extract_benchmarks(self, section: str) -> List[str]:
        """Extract short-term objectives/benchmarks"""
        benchmarks = []
        
        # Look for objective patterns
        obj_pattern = r'(?:Objective|Benchmark)\s*[#:]?\s*\d+[.:]\s*([^\n]+(?:\n(?!(?:Objective|Benchmark))[^\n]*)*)'
        matches = re.findall(obj_pattern, section, re.IGNORECASE | re.MULTILINE)
        
        for match in matches[:5]:  # Max 5 benchmarks
            clean = self._clean_text(match)
            if len(clean) > 20:
                benchmarks.append(clean[:300])
        
        return benchmarks
    
    def _extract_measurement(self, text: str) -> str:
        """Extract measurement criteria from text"""
        # Try explicit measurement patterns first
        measurement_match = self.patterns['measurement'].search(text)
        if measurement_match:
            return self._clean_text(measurement_match.group(1))[:200]
        
        # Look for percentage criteria
        percent_matches = self.patterns['percentage'].findall(text)
        if percent_matches:
            # Find context around percentage
            for pct in percent_matches:
                pattern = rf'.{{0,50}}{pct}%.{{0,50}}'
                match = re.search(pattern, text)
                if match:
                    return self._clean_text(match.group(0))
        
        # Look for "X out of Y" patterns
        ratio_pattern = r'\d+\s+(?:out\s+of|/)\s+\d+\s+(?:trials?|attempts?|opportunities)'
        ratio_match = re.search(ratio_pattern, text, re.IGNORECASE)
        if ratio_match:
            return ratio_match.group(0)
        
        return "teacher observation and data collection"
    
    def _extract_timeline(self, text: str) -> str:
        """Extract goal timeline"""
        timeline_patterns = [
            r'by\s+(\w+\s+\d{1,2},?\s+\d{4})',
            r'within\s+(\d+\s+(?:days?|weeks?|months?))',
            r'by\s+the\s+end\s+of\s+(.+?)(?:\.|$)',
            r'by\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        ]
        
        for pattern in timeline_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "annual review"
    
    def _classify_goal_domain(self, text: str) -> str:
        """Classify goal domain using keyword matching"""
        text_lower = text.lower()
        scores = {}
        
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[domain] = score
        
        if scores:
            return max(scores, key=scores.get)
        return 'other'
    
    def _classify_goal_category(self, text: str) -> str:
        """Classify goal category (academic, behavioral, functional)"""
        text_lower = text.lower()
        
        behavioral_keywords = [
            'behavior', 'conduct', 'social skills', 'self-regulation',
            'impulse', 'attention', 'on-task', 'compliance'
        ]
        
        functional_keywords = [
            'daily living', 'functional', 'self-care', 'independence',
            'life skills', 'vocational', 'transition', 'self-help'
        ]
        
        if any(kw in text_lower for kw in behavioral_keywords):
            return 'behavioral'
        elif any(kw in text_lower for kw in functional_keywords):
            return 'functional'
        else:
            return 'academic'
    
    def _calculate_goal_confidence(
        self,
        baseline: str,
        target: str,
        measurement: str,
        timeline: str
    ) -> float:
        """Calculate confidence score for goal extraction"""
        score = 0.0
        
        if baseline and len(baseline) > 20:
            score += 0.25
        if target and len(target) > 20:
            score += 0.25
        if measurement and measurement != "teacher observation and data collection":
            score += 0.25
        if timeline and timeline != "annual review":
            score += 0.25
        
        return score
    
    def _extract_accommodations(self, iep_doc: IEPDocument, text: str):
        """Extract accommodations and modifications"""
        # Find accommodation section
        acc_section = self._find_section(
            text, 
            ['accommodation', 'modification', 'support', 'supplementary aids']
        )
        
        if not acc_section:
            iep_doc.extraction_warnings.append("Accommodations section not found")
            return
        
        # Extract by category
        for category, keywords in self.ACCOMMODATION_CATEGORIES.items():
            for keyword in keywords:
                if keyword.lower() in acc_section.lower():
                    # Find context around keyword
                    pattern = rf'.{{0,30}}{re.escape(keyword)}.{{0,100}}'
                    match = re.search(pattern, acc_section, re.IGNORECASE)
                    description = match.group(0) if match else keyword
                    
                    accommodation = IEPAccommodation(
                        name=keyword,
                        category=category,
                        description=self._clean_text(description),
                    )
                    iep_doc.accommodations.append(accommodation)
        
        # Also extract bullet points
        bullet_pattern = r'[•\-\*]\s*([^\n•\-\*]+)'
        bullets = re.findall(bullet_pattern, acc_section)
        
        for bullet in bullets:
            clean_bullet = self._clean_text(bullet)
            if len(clean_bullet) > 10:
                # Check if already captured
                if not any(clean_bullet.lower() in a.name.lower() or 
                          a.name.lower() in clean_bullet.lower() 
                          for a in iep_doc.accommodations):
                    accommodation = IEPAccommodation(
                        name=clean_bullet[:50],
                        category=self._categorize_accommodation(clean_bullet),
                        description=clean_bullet,
                    )
                    iep_doc.accommodations.append(accommodation)
    
    def _categorize_accommodation(self, text: str) -> str:
        """Categorize an accommodation"""
        text_lower = text.lower()
        
        for category, keywords in self.ACCOMMODATION_CATEGORIES.items():
            if any(kw in text_lower for kw in keywords):
                return category
        
        return 'other'
    
    def _extract_services(self, iep_doc: IEPDocument, text: str):
        """Extract special education related services"""
        # Find services section
        services_section = self._find_section(
            text,
            ['services', 'related services', 'service delivery', 'special education services']
        )
        
        if not services_section:
            services_section = text  # Search entire document
        
        # Extract using service pattern
        matches = self.patterns['service_minutes'].findall(services_section)
        
        for service_type, minutes in matches:
            service = IEPService(
                service_type=service_type.strip(),
                provider="",
                minutes_per_week=int(minutes),
                location="",
            )
            iep_doc.services.append(service)
        
        # Also look for services in table format
        table_pattern = r'(Speech|OT|PT|Counseling|Psychology|Special Ed)[^\d]*(\d+)\s*(?:min|minutes)'
        table_matches = re.findall(table_pattern, text, re.IGNORECASE)
        
        for service_type, minutes in table_matches:
            # Check if not already captured
            if not any(s.service_type.lower() == service_type.lower() for s in iep_doc.services):
                service = IEPService(
                    service_type=service_type.strip(),
                    provider="",
                    minutes_per_week=int(minutes),
                    location="",
                )
                iep_doc.services.append(service)
    
    def _extract_placement(self, iep_doc: IEPDocument, text: str):
        """Extract placement information"""
        placement_section = self._find_section(
            text,
            ['placement', 'educational setting', 'least restrictive', 'LRE']
        )
        
        if not placement_section:
            return
        
        # Common placements
        placements = [
            'general education', 'regular education', 'inclusion',
            'resource room', 'self-contained', 'special class',
            'separate school', 'residential', 'home instruction'
        ]
        
        section_lower = placement_section.lower()
        for placement in placements:
            if placement in section_lower:
                iep_doc.placement = placement
                break
        
        # Extract percentage in general ed
        gen_ed_pattern = r'(\d+)\s*%\s*(?:of\s+time\s+)?(?:in\s+)?(?:general|regular)\s+education'
        match = re.search(gen_ed_pattern, placement_section, re.IGNORECASE)
        if match:
            iep_doc.time_in_general_ed_percent = float(match.group(1))
    
    def _extract_present_levels(self, iep_doc: IEPDocument, text: str):
        """Extract present levels of performance"""
        plop_section = self._find_section(
            text,
            ['present level', 'PLOP', 'PLAAFP', 'current performance', 'present performance']
        )
        
        if not plop_section:
            return
        
        # Extract by domain
        for domain in ['reading', 'math', 'writing', 'behavior', 'social', 'communication']:
            pattern = rf'{domain}[:\s]+(.{{50,500}}?)(?=\n[A-Z]|$)'
            match = re.search(pattern, plop_section, re.IGNORECASE | re.DOTALL)
            if match:
                iep_doc.present_levels[domain] = self._clean_text(match.group(1))
    
    def _find_section(self, text: str, keywords: List[str]) -> Optional[str]:
        """Find text section containing keywords"""
        for keyword in keywords:
            # Look for section header
            pattern = rf'{keyword}[s]?\s*[:.]?\s*\n(.{{100,2000}}?)(?=\n[A-Z]{{2,}}|\n\n\n|$)'
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return keyword + "\n" + match.group(1)
        
        # Fallback: find any mention with context
        for keyword in keywords:
            pattern = rf'.{{0,100}}{keyword}.{{0,500}}'
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(0)
        
        return None
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove page markers
        text = re.sub(r'---\s*Page\s*\d+\s*---', '', text)
        
        # Remove common artifacts
        text = re.sub(r'\[?\d+\]?$', '', text)  # Trailing numbers/references
        
        return text.strip()
    
    def _calculate_confidence(self, iep_doc: IEPDocument):
        """Calculate overall extraction confidence"""
        scores = []
        
        # Student info confidence
        student_score = 0
        if iep_doc.student.name:
            student_score += 0.4
        if iep_doc.student.grade_level:
            student_score += 0.2
        if iep_doc.student.disability_categories:
            student_score += 0.2
        if iep_doc.student.date_of_birth:
            student_score += 0.2
        scores.append(student_score)
        
        # Goals confidence
        if iep_doc.goals:
            goal_scores = [g.confidence for g in iep_doc.goals]
            scores.append(np.mean(goal_scores))
        else:
            scores.append(0.0)
        
        # Services confidence
        if iep_doc.services:
            scores.append(0.8)
        else:
            scores.append(0.3)
        
        # Accommodations confidence
        if iep_doc.accommodations:
            scores.append(min(len(iep_doc.accommodations) / 5, 1.0))
        else:
            scores.append(0.2)
        
        iep_doc.extraction_confidence = np.mean(scores)
    
    def _validate_extraction(self, iep_doc: IEPDocument):
        """Validate extracted data and add warnings"""
        # Check for minimum required fields
        if not iep_doc.student.name:
            iep_doc.extraction_warnings.append("Student name not extracted")
        
        if not iep_doc.goals:
            iep_doc.extraction_warnings.append("No goals extracted")
        
        if not iep_doc.services:
            iep_doc.extraction_warnings.append("No services extracted")
        
        # Validate goals
        for i, goal in enumerate(iep_doc.goals):
            if not goal.target:
                iep_doc.extraction_warnings.append(f"Goal {goal.goal_number}: No target specified")
            if goal.confidence < 0.5:
                iep_doc.extraction_warnings.append(f"Goal {goal.goal_number}: Low extraction confidence")


# Example usage and testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Example with mock data
    print("IEP Extractor initialized")
    print("Dependencies available:")
    print(f"  - PyMuPDF: {HAS_PYMUPDF}")
    print(f"  - Tesseract: {HAS_TESSERACT}")
    print(f"  - spaCy: {HAS_SPACY}")
    print(f"  - Transformers: {HAS_TRANSFORMERS}")
    
    extractor = IEPExtractor()
    
    # Test goal classification
    test_text = """
    Goal #1: Reading Comprehension
    The student will improve reading comprehension skills from a current level 
    of 2nd grade to 3rd grade as measured by curriculum-based assessments 
    with 80% accuracy by June 2026.
    """
    
    domain = extractor._classify_goal_domain(test_text)
    category = extractor._classify_goal_category(test_text)
    measurement = extractor._extract_measurement(test_text)
    timeline = extractor._extract_timeline(test_text)
    
    print("\nTest goal analysis:")
    print(f"  Domain: {domain}")
    print(f"  Category: {category}")
    print(f"  Measurement: {measurement}")
    print(f"  Timeline: {timeline}")
