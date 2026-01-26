"""
Curriculum Parser - Extract structured data from curriculum documents

Parses various curriculum formats:
- State standards documents (CCSS, state-specific)
- Scope and sequence documents
- Curriculum frameworks
- Learning objectives
"""

import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class LearningStandard:
    """Individual learning standard"""
    code: str  # e.g., "CCSS.ELA-LITERACY.RL.3.1"
    description: str
    grade_level: str
    subject: str
    domain: str
    cluster: Optional[str] = None
    strand: Optional[str] = None
    prerequisites: List[str] = field(default_factory=list)
    related_standards: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "description": self.description,
            "grade_level": self.grade_level,
            "subject": self.subject,
            "domain": self.domain,
            "cluster": self.cluster,
            "strand": self.strand,
            "prerequisites": self.prerequisites,
            "related_standards": self.related_standards,
        }


@dataclass
class CurriculumUnit:
    """Curriculum unit or module"""
    title: str
    unit_number: int
    grade_level: str
    subject: str
    duration_weeks: Optional[int] = None
    standards: List[str] = field(default_factory=list)
    objectives: List[str] = field(default_factory=list)
    essential_questions: List[str] = field(default_factory=list)
    vocabulary: List[str] = field(default_factory=list)
    assessments: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "unit_number": self.unit_number,
            "grade_level": self.grade_level,
            "subject": self.subject,
            "duration_weeks": self.duration_weeks,
            "standards": self.standards,
            "objectives": self.objectives,
            "essential_questions": self.essential_questions,
            "vocabulary": self.vocabulary,
            "assessments": self.assessments,
        }


@dataclass
class CurriculumDocument:
    """Complete parsed curriculum document"""
    title: str
    subject: str
    grade_levels: List[str]
    standards: List[LearningStandard] = field(default_factory=list)
    units: List[CurriculumUnit] = field(default_factory=list)
    scope_sequence: Dict[str, List[str]] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "subject": self.subject,
            "grade_levels": self.grade_levels,
            "standards": [s.to_dict() for s in self.standards],
            "units": [u.to_dict() for u in self.units],
            "scope_sequence": self.scope_sequence,
            "metadata": self.metadata,
        }


class CurriculumParser:
    """
    Parse curriculum documents into structured format
    
    Supports:
    - Common Core State Standards (CCSS)
    - State-specific standards
    - Curriculum frameworks
    - Scope and sequence documents
    """
    
    # Standard code patterns
    STANDARD_PATTERNS = {
        'ccss_ela': re.compile(
            r'CCSS\.ELA-LITERACY\.([A-Z]+)\.(\d+|K)\.(\d+)(?:\.([a-z]))?',
            re.IGNORECASE
        ),
        'ccss_math': re.compile(
            r'CCSS\.MATH\.CONTENT\.(\d+|K)\.([A-Z]+)\.([A-Z])\.(\d+)(?:\.([a-z]))?',
            re.IGNORECASE
        ),
        'ngss': re.compile(
            r'(\d+)-([A-Z]+)(\d+)-(\d+)',
            re.IGNORECASE
        ),
        'generic': re.compile(
            r'([A-Z]{2,})[\.-]?(\d+|K)[\.-]?([A-Z]*)[\.-]?(\d+)(?:[\.-]([a-z\d]+))?',
            re.IGNORECASE
        ),
    }
    
    # Subject keywords
    SUBJECT_KEYWORDS = {
        'math': ['math', 'mathematics', 'algebra', 'geometry', 'arithmetic'],
        'ela': ['reading', 'writing', 'language arts', 'english', 'literacy', 'ela'],
        'science': ['science', 'biology', 'chemistry', 'physics', 'earth science'],
        'social_studies': ['social studies', 'history', 'geography', 'civics'],
    }
    
    def __init__(self):
        """Initialize Curriculum Parser"""
        pass
    
    def parse(self, text: str, document_type: str = "auto") -> CurriculumDocument:
        """
        Parse curriculum document text
        
        Args:
            text: Document text content
            document_type: Type of document (standards, scope_sequence, framework, auto)
            
        Returns:
            Parsed CurriculumDocument
        """
        # Detect document type if auto
        if document_type == "auto":
            document_type = self._detect_document_type(text)
        
        # Initialize document
        doc = CurriculumDocument(
            title=self._extract_title(text),
            subject=self._detect_subject(text),
            grade_levels=self._extract_grade_levels(text),
        )
        
        # Parse based on type
        if document_type == "standards":
            doc.standards = self._parse_standards(text)
        elif document_type == "scope_sequence":
            doc.scope_sequence = self._parse_scope_sequence(text)
            doc.units = self._parse_units(text)
        elif document_type == "framework":
            doc.standards = self._parse_standards(text)
            doc.units = self._parse_units(text)
        else:
            # Parse everything
            doc.standards = self._parse_standards(text)
            doc.units = self._parse_units(text)
            doc.scope_sequence = self._parse_scope_sequence(text)
        
        return doc
    
    def _detect_document_type(self, text: str) -> str:
        """Detect curriculum document type"""
        text_lower = text.lower()
        
        if 'scope and sequence' in text_lower or 'scope & sequence' in text_lower:
            return 'scope_sequence'
        elif 'standard' in text_lower and ('ccss' in text_lower or 'state standard' in text_lower):
            return 'standards'
        elif 'curriculum' in text_lower and 'framework' in text_lower:
            return 'framework'
        else:
            return 'general'
    
    def _detect_subject(self, text: str) -> str:
        """Detect subject area from text"""
        text_lower = text.lower()
        
        for subject, keywords in self.SUBJECT_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return subject
        
        return 'general'
    
    def _extract_title(self, text: str) -> str:
        """Extract document title"""
        # Look for title at beginning
        lines = text.split('\n')
        for line in lines[:10]:
            line = line.strip()
            if len(line) > 10 and len(line) < 200:
                # Likely a title
                if not line.startswith(('http', 'www', 'Page', 'Copyright')):
                    return line
        
        return "Curriculum Document"
    
    def _extract_grade_levels(self, text: str) -> List[str]:
        """Extract grade levels mentioned in document"""
        grades = set()
        
        # Pattern for grade mentions
        grade_patterns = [
            r'Grade\s*(\d+)',
            r'(\d+)(?:st|nd|rd|th)\s+Grade',
            r'K-(\d+)',
            r'Grades?\s+(\d+)-(\d+)',
        ]
        
        for pattern in grade_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    for g in match:
                        if g and g.isdigit():
                            grades.add(g)
                elif match.isdigit():
                    grades.add(match)
        
        # Also look for K/PK
        if re.search(r'\bKindergarten\b|\bGrade K\b', text, re.IGNORECASE):
            grades.add('K')
        if re.search(r'\bPre-?K\b|\bPreschool\b', text, re.IGNORECASE):
            grades.add('PK')
        
        return sorted(list(grades), key=lambda x: -1 if x in ['PK', 'K'] else int(x))
    
    def _parse_standards(self, text: str) -> List[LearningStandard]:
        """Parse learning standards from text"""
        standards = []
        
        # Try each pattern
        for pattern_name, pattern in self.STANDARD_PATTERNS.items():
            matches = pattern.finditer(text)
            
            for match in matches:
                # Extract context around match for description
                start = max(0, match.start() - 10)
                end = min(len(text), match.end() + 500)
                context = text[start:end]
                
                # Find description (usually follows the code)
                desc_match = re.search(
                    rf'{re.escape(match.group(0))}\s*[:\-]?\s*(.+?)(?=\n\n|\n[A-Z]|$)',
                    context,
                    re.DOTALL
                )
                description = desc_match.group(1).strip() if desc_match else ""
                
                # Parse components based on pattern
                code = match.group(0)
                grade_level, subject, domain = self._parse_standard_code(code, pattern_name)
                
                standard = LearningStandard(
                    code=code,
                    description=description[:500],
                    grade_level=grade_level,
                    subject=subject,
                    domain=domain,
                )
                
                # Avoid duplicates
                if not any(s.code == standard.code for s in standards):
                    standards.append(standard)
        
        return standards
    
    def _parse_standard_code(
        self, 
        code: str, 
        pattern_name: str
    ) -> tuple[str, str, str]:
        """Parse standard code into components"""
        if pattern_name == 'ccss_ela':
            match = self.STANDARD_PATTERNS['ccss_ela'].match(code)
            if match:
                domain = match.group(1)  # RL, RI, W, etc.
                grade = match.group(2)
                return grade, 'ela', domain
        
        elif pattern_name == 'ccss_math':
            match = self.STANDARD_PATTERNS['ccss_math'].match(code)
            if match:
                grade = match.group(1)
                domain = match.group(2)
                return grade, 'math', domain
        
        elif pattern_name == 'ngss':
            match = self.STANDARD_PATTERNS['ngss'].match(code)
            if match:
                grade = match.group(1)
                domain = match.group(2)
                return grade, 'science', domain
        
        # Generic fallback
        return '', '', ''
    
    def _parse_units(self, text: str) -> List[CurriculumUnit]:
        """Parse curriculum units"""
        units = []
        
        # Look for unit headers
        unit_pattern = r'Unit\s*(\d+)[:\s]+(.+?)(?=\nUnit\s*\d+|$)'
        matches = re.findall(unit_pattern, text, re.IGNORECASE | re.DOTALL)
        
        for num, content in matches:
            # Extract title (first line)
            lines = content.strip().split('\n')
            title = lines[0].strip() if lines else f"Unit {num}"
            
            # Extract objectives
            objectives = self._extract_list_items(content, ['objective', 'student will', 'swbat'])
            
            # Extract essential questions
            eq_patterns = ['essential question', 'eq:', 'driving question']
            essential_questions = self._extract_list_items(content, eq_patterns)
            
            # Extract vocabulary
            vocab = self._extract_vocabulary(content)
            
            # Extract standards mentioned
            standards = []
            for pattern in self.STANDARD_PATTERNS.values():
                standards.extend(m.group(0) for m in pattern.finditer(content))
            
            unit = CurriculumUnit(
                title=title[:200],
                unit_number=int(num),
                grade_level="",
                subject=self._detect_subject(content),
                objectives=objectives,
                essential_questions=essential_questions,
                vocabulary=vocab,
                standards=list(set(standards)),
            )
            units.append(unit)
        
        return units
    
    def _parse_scope_sequence(self, text: str) -> Dict[str, List[str]]:
        """Parse scope and sequence into month/quarter mapping"""
        scope_sequence = {}
        
        # Look for month or quarter headers
        time_patterns = [
            r'(January|February|March|April|May|June|July|August|September|October|November|December)[:\s]+(.+?)(?=\n(?:January|February|March|April|May|June|July|August|September|October|November|December)|$)',
            r'(Q[1-4]|Quarter\s*[1-4])[:\s]+(.+?)(?=\n(?:Q[1-4]|Quarter)|$)',
            r'(Week\s*\d+)[:\s]+(.+?)(?=\nWeek\s*\d+|$)',
        ]
        
        for pattern in time_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for time_period, content in matches:
                topics = self._extract_list_items(content, [])
                if not topics:
                    # Just use the content as-is
                    topics = [line.strip() for line in content.split('\n') if line.strip()]
                scope_sequence[time_period] = topics[:20]  # Limit to 20 items
        
        return scope_sequence
    
    def _extract_list_items(self, text: str, keywords: List[str]) -> List[str]:
        """Extract list items from text"""
        items = []
        
        # Look near keywords
        for keyword in keywords:
            pattern = rf'{keyword}[:\s]+(.+?)(?=\n\n|$)'
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                # Split by bullets or numbers
                parts = re.split(r'[•\-\*]|\d+\.', match)
                for part in parts:
                    part = part.strip()
                    if len(part) > 10:
                        items.append(part[:300])
        
        # Also look for bullet lists
        bullet_pattern = r'[•\-\*]\s*(.+?)(?=\n[•\-\*]|\n\n|$)'
        bullets = re.findall(bullet_pattern, text)
        for bullet in bullets:
            bullet = bullet.strip()
            if len(bullet) > 10 and bullet not in items:
                items.append(bullet[:300])
        
        return items[:20]  # Limit
    
    def _extract_vocabulary(self, text: str) -> List[str]:
        """Extract vocabulary words"""
        vocab = []
        
        # Look for vocabulary section
        vocab_patterns = [
            r'Vocabulary[:\s]+(.+?)(?=\n\n|$)',
            r'Key Terms[:\s]+(.+?)(?=\n\n|$)',
            r'Academic Vocabulary[:\s]+(.+?)(?=\n\n|$)',
        ]
        
        for pattern in vocab_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                content = match.group(1)
                # Split by commas or bullets
                words = re.split(r'[,•\-\*]|\d+\.', content)
                for word in words:
                    word = word.strip()
                    if 2 < len(word) < 50 and not word.isdigit():
                        vocab.append(word)
        
        return list(set(vocab))[:50]  # Unique, limited


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    parser = CurriculumParser()
    
    test_text = """
    Grade 3 Mathematics Curriculum
    
    Unit 1: Addition and Subtraction Within 1000
    
    Standards:
    CCSS.MATH.CONTENT.3.NBT.A.2 - Fluently add and subtract within 1000
    
    Objectives:
    • Students will add three-digit numbers using regrouping
    • Students will subtract three-digit numbers using regrouping
    
    Essential Questions:
    • How do we use place value to add and subtract?
    
    Vocabulary: addend, sum, difference, regrouping
    """
    
    doc = parser.parse(test_text)
    print(f"Title: {doc.title}")
    print(f"Subject: {doc.subject}")
    print(f"Grade Levels: {doc.grade_levels}")
    print(f"Standards: {len(doc.standards)}")
    print(f"Units: {len(doc.units)}")
