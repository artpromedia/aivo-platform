# Document Intelligence Service

Python-based service for extracting structured data from educational documents using OCR and NLP.

## Features

- **IEP Extraction**: Extract goals, accommodations, and services from IEP PDFs
- **Curriculum Parsing**: Parse curriculum documents and standards
- **Document Classification**: Automatically classify document types
- **Text Embeddings**: Generate semantic embeddings for search

## Architecture

```
document-intelligence-svc/
├── app/
│   ├── extractors/
│   │   ├── iep_extractor.py      # IEP document extraction
│   │   ├── curriculum_parser.py   # Curriculum document parsing
│   │   └── pdf_processor.py       # Core PDF processing
│   ├── models/
│   │   ├── ner_model.py          # Named Entity Recognition
│   │   └── classifier.py          # Document classification
│   ├── embeddings/
│   │   └── text_embeddings.py     # Semantic embeddings
│   ├── api/
│   │   └── routes.py              # FastAPI routes
│   └── main.py                    # Application entry point
├── tests/
├── Dockerfile
└── requirements.txt
```

## Installation

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Usage

```python
from app.extractors.iep_extractor import IEPExtractor

extractor = IEPExtractor()
iep_doc = extractor.extract_from_pdf("student_iep.pdf")

print(f"Student: {iep_doc.student_name}")
print(f"Goals: {len(iep_doc.goals)}")
for goal in iep_doc.goals:
    print(f"  - {goal.domain}: {goal.target}")
```

## API Endpoints

- `POST /extract/iep` - Extract IEP data from uploaded PDF
- `POST /extract/curriculum` - Parse curriculum documents
- `POST /classify` - Classify document type
- `POST /embeddings` - Generate text embeddings
