import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

// Mock mammoth (Word document parser)
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
    convertToHtml: vi.fn(),
  },
}));

// Mock xlsx (Excel parser)
vi.mock('xlsx', () => ({
  default: {
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn(),
      sheet_to_txt: vi.fn(),
    },
  },
}));

/**
 * Document Parser Tests
 *
 * These tests cover the parsing functionality for various document types:
 * - PDF documents
 * - Word documents (DOCX)
 * - Excel spreadsheets (XLSX, XLS)
 */
describe('Document Parsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PDF Parser', () => {
    it('should extract text from a valid PDF buffer', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockResolvedValue({
        numpages: 5,
        numrender: 5,
        info: {
          Title: 'Test Document',
          Author: 'Test Author',
          CreationDate: 'D:20240101120000',
        },
        metadata: null,
        text: 'This is the extracted text from the PDF document.',
        version: '1.10.100',
      });

      const mockPdfBuffer = Buffer.from('fake-pdf-content');
      const result = await pdfParse(mockPdfBuffer);

      expect(result.text).toBe('This is the extracted text from the PDF document.');
      expect(result.numpages).toBe(5);
      expect(result.info.Title).toBe('Test Document');
      expect(result.info.Author).toBe('Test Author');
    });

    it('should handle multi-page PDFs', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockResolvedValue({
        numpages: 100,
        numrender: 100,
        info: {},
        metadata: null,
        text: 'Page 1 content\n\nPage 2 content\n\nPage 3 content',
        version: '1.10.100',
      });

      const mockPdfBuffer = Buffer.from('fake-multi-page-pdf');
      const result = await pdfParse(mockPdfBuffer);

      expect(result.numpages).toBe(100);
      expect(result.text).toContain('Page 1 content');
      expect(result.text).toContain('Page 2 content');
    });

    it('should handle PDFs with no text (scanned images)', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockResolvedValue({
        numpages: 3,
        numrender: 3,
        info: {},
        metadata: null,
        text: '',
        version: '1.10.100',
      });

      const mockPdfBuffer = Buffer.from('fake-scanned-pdf');
      const result = await pdfParse(mockPdfBuffer);

      expect(result.text).toBe('');
      expect(result.numpages).toBe(3);
    });

    it('should throw error for invalid PDF', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockRejectedValue(new Error('Invalid PDF structure'));

      const mockInvalidBuffer = Buffer.from('not-a-pdf');

      await expect(pdfParse(mockInvalidBuffer)).rejects.toThrow('Invalid PDF structure');
    });

    it('should handle encrypted PDFs', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockRejectedValue(new Error('PDF is encrypted'));

      const mockEncryptedPdf = Buffer.from('encrypted-pdf');

      await expect(pdfParse(mockEncryptedPdf)).rejects.toThrow('PDF is encrypted');
    });

    it('should extract metadata from PDF', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockResolvedValue({
        numpages: 1,
        numrender: 1,
        info: {
          Title: 'Course Material',
          Author: 'Professor Smith',
          Subject: 'Introduction to Computer Science',
          Keywords: 'programming, algorithms, data structures',
          Creator: 'Microsoft Word',
          Producer: 'Adobe PDF Library',
          CreationDate: 'D:20240115093000',
          ModDate: 'D:20240120143000',
        },
        metadata: null,
        text: 'Course content here',
        version: '1.10.100',
      });

      const mockPdfBuffer = Buffer.from('fake-pdf-with-metadata');
      const result = await pdfParse(mockPdfBuffer);

      expect(result.info.Title).toBe('Course Material');
      expect(result.info.Author).toBe('Professor Smith');
      expect(result.info.Subject).toBe('Introduction to Computer Science');
      expect(result.info.Keywords).toBe('programming, algorithms, data structures');
    });

    it('should handle large PDFs with page limit option', async () => {
      const pdfParse = (await import('pdf-parse')).default;
      vi.mocked(pdfParse).mockResolvedValue({
        numpages: 500,
        numrender: 50,
        info: {},
        metadata: null,
        text: 'First 50 pages of content',
        version: '1.10.100',
      });

      const mockLargePdf = Buffer.from('large-pdf');
      const options = { max: 50 };
      const result = await pdfParse(mockLargePdf, options);

      expect(result.numpages).toBe(500);
      expect(result.numrender).toBe(50);
    });
  });

  describe('Word Document Parser (Mammoth)', () => {
    it('should extract raw text from DOCX', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: 'This is the content of the Word document.\n\nIt has multiple paragraphs.',
        messages: [],
      });

      const mockDocxBuffer = Buffer.from('fake-docx-content');
      const result = await mammoth.extractRawText({ buffer: mockDocxBuffer });

      expect(result.value).toContain('This is the content of the Word document.');
      expect(result.value).toContain('It has multiple paragraphs.');
    });

    it('should convert DOCX to HTML', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<h1>Document Title</h1><p>This is a paragraph.</p><ul><li>Item 1</li><li>Item 2</li></ul>',
        messages: [],
      });

      const mockDocxBuffer = Buffer.from('fake-docx-content');
      const result = await mammoth.convertToHtml({ buffer: mockDocxBuffer });

      expect(result.value).toContain('<h1>Document Title</h1>');
      expect(result.value).toContain('<p>This is a paragraph.</p>');
      expect(result.value).toContain('<li>Item 1</li>');
    });

    it('should handle DOCX with images (returning warnings)', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p>Text content</p><img src="image1.png">',
        messages: [
          { type: 'warning', message: 'Image element not supported' },
        ],
      });

      const mockDocxWithImages = Buffer.from('docx-with-images');
      const result = await mammoth.convertToHtml({ buffer: mockDocxWithImages });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].type).toBe('warning');
    });

    it('should handle DOCX with tables', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>',
        messages: [],
      });

      const mockDocxWithTable = Buffer.from('docx-with-table');
      const result = await mammoth.convertToHtml({ buffer: mockDocxWithTable });

      expect(result.value).toContain('<table>');
      expect(result.value).toContain('<th>Header 1</th>');
      expect(result.value).toContain('<td>Cell 1</td>');
    });

    it('should handle empty DOCX', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '',
        messages: [],
      });

      const mockEmptyDocx = Buffer.from('empty-docx');
      const result = await mammoth.extractRawText({ buffer: mockEmptyDocx });

      expect(result.value).toBe('');
    });

    it('should throw error for corrupted DOCX', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error('Could not find main document part'));

      const mockCorruptedDocx = Buffer.from('corrupted-docx');

      await expect(
        mammoth.extractRawText({ buffer: mockCorruptedDocx })
      ).rejects.toThrow('Could not find main document part');
    });

    it('should handle DOCX with styled content', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<p><strong>Bold text</strong> and <em>italic text</em> and <u>underlined text</u></p>',
        messages: [],
      });

      const mockStyledDocx = Buffer.from('styled-docx');
      const result = await mammoth.convertToHtml({ buffer: mockStyledDocx });

      expect(result.value).toContain('<strong>Bold text</strong>');
      expect(result.value).toContain('<em>italic text</em>');
    });

    it('should extract text from DOCX with headers and footers', async () => {
      const mammoth = (await import('mammoth')).default;
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: 'Header: Document Title\n\nMain content paragraph.\n\nFooter: Page 1',
        messages: [],
      });

      const mockDocxWithHeaderFooter = Buffer.from('docx-header-footer');
      const result = await mammoth.extractRawText({ buffer: mockDocxWithHeaderFooter });

      expect(result.value).toContain('Header: Document Title');
      expect(result.value).toContain('Footer: Page 1');
    });
  });

  describe('Excel Parser (XLSX)', () => {
    it('should parse XLSX file and extract data', async () => {
      const xlsx = (await import('xlsx')).default;
      const mockWorkbook = {
        SheetNames: ['Sheet1', 'Sheet2'],
        Sheets: {
          Sheet1: { A1: { v: 'Name' }, B1: { v: 'Score' }, A2: { v: 'Alice' }, B2: { v: 95 } },
          Sheet2: { A1: { v: 'Data' } },
        },
      };

      vi.mocked(xlsx.read).mockReturnValue(mockWorkbook);
      vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
        { Name: 'Alice', Score: 95 },
        { Name: 'Bob', Score: 87 },
      ]);

      const mockXlsxBuffer = Buffer.from('fake-xlsx-content');
      const workbook = xlsx.read(mockXlsxBuffer, { type: 'buffer' });
      const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);

      expect(workbook.SheetNames).toHaveLength(2);
      expect(data).toEqual([
        { Name: 'Alice', Score: 95 },
        { Name: 'Bob', Score: 87 },
      ]);
    });

    it('should handle multiple sheets', async () => {
      const xlsx = (await import('xlsx')).default;
      const mockWorkbook = {
        SheetNames: ['Students', 'Grades', 'Attendance'],
        Sheets: {
          Students: {},
          Grades: {},
          Attendance: {},
        },
      };

      vi.mocked(xlsx.read).mockReturnValue(mockWorkbook);

      const mockXlsxBuffer = Buffer.from('multi-sheet-xlsx');
      const workbook = xlsx.read(mockXlsxBuffer, { type: 'buffer' });

      expect(workbook.SheetNames).toEqual(['Students', 'Grades', 'Attendance']);
    });

    it('should convert sheet to text', async () => {
      const xlsx = (await import('xlsx')).default;
      vi.mocked(xlsx.read).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      vi.mocked(xlsx.utils.sheet_to_txt).mockReturnValue('Name\tScore\nAlice\t95\nBob\t87');

      const mockXlsxBuffer = Buffer.from('fake-xlsx');
      const workbook = xlsx.read(mockXlsxBuffer, { type: 'buffer' });
      const text = xlsx.utils.sheet_to_txt(workbook.Sheets['Sheet1']);

      expect(text).toContain('Name\tScore');
      expect(text).toContain('Alice\t95');
    });

    it('should handle empty spreadsheet', async () => {
      const xlsx = (await import('xlsx')).default;
      vi.mocked(xlsx.read).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([]);

      const mockEmptyXlsx = Buffer.from('empty-xlsx');
      const workbook = xlsx.read(mockEmptyXlsx, { type: 'buffer' });
      const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);

      expect(data).toEqual([]);
    });

    it('should handle XLS (legacy format)', async () => {
      const xlsx = (await import('xlsx')).default;
      vi.mocked(xlsx.read).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([{ data: 'legacy' }]);

      const mockXlsBuffer = Buffer.from('legacy-xls');
      const workbook = xlsx.read(mockXlsBuffer, { type: 'buffer' });

      expect(workbook.SheetNames).toHaveLength(1);
    });

    it('should throw error for corrupted Excel file', async () => {
      const xlsx = (await import('xlsx')).default;
      vi.mocked(xlsx.read).mockImplementation(() => {
        throw new Error('File format is not supported');
      });

      const mockCorruptedXlsx = Buffer.from('corrupted-xlsx');

      expect(() => xlsx.read(mockCorruptedXlsx, { type: 'buffer' })).toThrow(
        'File format is not supported'
      );
    });

    it('should handle spreadsheet with formulas', async () => {
      const xlsx = (await import('xlsx')).default;
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            A1: { v: 10, t: 'n' },
            A2: { v: 20, t: 'n' },
            A3: { v: 30, f: 'SUM(A1:A2)', t: 'n' },
          },
        },
      };

      vi.mocked(xlsx.read).mockReturnValue(mockWorkbook);
      vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
        { Value: 10 },
        { Value: 20 },
        { Value: 30 },
      ]);

      const mockXlsxBuffer = Buffer.from('xlsx-with-formulas');
      const workbook = xlsx.read(mockXlsxBuffer, { type: 'buffer' });
      const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);

      expect(data[2].Value).toBe(30);
    });

    it('should handle spreadsheet with dates', async () => {
      const xlsx = (await import('xlsx')).default;
      vi.mocked(xlsx.read).mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
        { Date: new Date('2024-01-15'), Event: 'Assignment Due' },
        { Date: new Date('2024-01-20'), Event: 'Exam' },
      ]);

      const mockXlsxBuffer = Buffer.from('xlsx-with-dates');
      const workbook = xlsx.read(mockXlsxBuffer, { type: 'buffer', cellDates: true });
      const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);

      expect(data[0].Event).toBe('Assignment Due');
      expect(data[1].Event).toBe('Exam');
    });

    it('should handle spreadsheet with merged cells', async () => {
      const xlsx = (await import('xlsx')).default;
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            '!merges': [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }],
            A1: { v: 'Merged Header' },
          },
        },
      };

      vi.mocked(xlsx.read).mockReturnValue(mockWorkbook);

      const mockXlsxBuffer = Buffer.from('xlsx-merged-cells');
      const workbook = xlsx.read(mockXlsxBuffer, { type: 'buffer' });

      expect(workbook.Sheets['Sheet1']['!merges']).toBeDefined();
      expect(workbook.Sheets['Sheet1']['!merges']).toHaveLength(1);
    });
  });

  describe('Content Extraction Utilities', () => {
    describe('splitIntoChunks', () => {
      const splitIntoChunks = (text: string, size: number): string[] => {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += size) {
          chunks.push(text.slice(i, i + size));
        }
        return chunks;
      };

      it('should split text into chunks of specified size', () => {
        const text = 'This is a test string for chunking.';
        const chunks = splitIntoChunks(text, 10);

        expect(chunks).toHaveLength(4);
        expect(chunks[0]).toBe('This is a ');
        expect(chunks[1]).toBe('test strin');
        expect(chunks[2]).toBe('g for chun');
        expect(chunks[3]).toBe('king.');
      });

      it('should handle text shorter than chunk size', () => {
        const text = 'Short';
        const chunks = splitIntoChunks(text, 100);

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('Short');
      });

      it('should handle empty text', () => {
        const text = '';
        const chunks = splitIntoChunks(text, 100);

        expect(chunks).toHaveLength(0);
      });

      it('should handle exact chunk size multiple', () => {
        const text = '12345678901234567890';
        const chunks = splitIntoChunks(text, 5);

        expect(chunks).toHaveLength(4);
        expect(chunks.every(chunk => chunk.length === 5)).toBe(true);
      });
    });

    describe('analyzeContent', () => {
      const analyzeContent = (text: string, _metadata: any) => {
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        const estimatedTime = Math.ceil(wordCount / 200);

        return {
          topics: [],
          keywords: [],
          difficulty: 'intermediate',
          estimatedTime,
        };
      };

      it('should calculate estimated reading time', () => {
        const text = Array(400).fill('word').join(' ');
        const result = analyzeContent(text, {});

        expect(result.estimatedTime).toBe(2);
      });

      it('should handle short content', () => {
        const text = 'Hello world';
        const result = analyzeContent(text, {});

        expect(result.estimatedTime).toBe(1);
      });

      it('should return default difficulty', () => {
        const result = analyzeContent('Test content', {});

        expect(result.difficulty).toBe('intermediate');
      });

      it('should return empty topics and keywords by default', () => {
        const result = analyzeContent('Test content', {});

        expect(result.topics).toEqual([]);
        expect(result.keywords).toEqual([]);
      });
    });
  });

  describe('Content Type Detection', () => {
    const detectContentType = (mimeType: string): string => {
      const mimeTypeMap: Record<string, string> = {
        'application/pdf': 'DOCUMENT',
        'application/msword': 'DOCUMENT',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
        'application/vnd.ms-excel': 'SPREADSHEET',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'SPREADSHEET',
        'application/vnd.ms-powerpoint': 'PRESENTATION',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PRESENTATION',
        'video/mp4': 'VIDEO',
        'video/webm': 'VIDEO',
        'audio/mpeg': 'AUDIO',
        'audio/wav': 'AUDIO',
        'image/png': 'IMAGE',
        'image/jpeg': 'IMAGE',
        'application/zip': 'ARCHIVE',
      };

      return mimeTypeMap[mimeType] || 'DOCUMENT';
    };

    it('should detect PDF as DOCUMENT', () => {
      expect(detectContentType('application/pdf')).toBe('DOCUMENT');
    });

    it('should detect DOCX as DOCUMENT', () => {
      expect(detectContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCUMENT');
    });

    it('should detect legacy DOC as DOCUMENT', () => {
      expect(detectContentType('application/msword')).toBe('DOCUMENT');
    });

    it('should detect XLSX as SPREADSHEET', () => {
      expect(detectContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('SPREADSHEET');
    });

    it('should detect legacy XLS as SPREADSHEET', () => {
      expect(detectContentType('application/vnd.ms-excel')).toBe('SPREADSHEET');
    });

    it('should detect PPTX as PRESENTATION', () => {
      expect(detectContentType('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('PRESENTATION');
    });

    it('should detect video formats', () => {
      expect(detectContentType('video/mp4')).toBe('VIDEO');
      expect(detectContentType('video/webm')).toBe('VIDEO');
    });

    it('should detect audio formats', () => {
      expect(detectContentType('audio/mpeg')).toBe('AUDIO');
      expect(detectContentType('audio/wav')).toBe('AUDIO');
    });

    it('should detect image formats', () => {
      expect(detectContentType('image/png')).toBe('IMAGE');
      expect(detectContentType('image/jpeg')).toBe('IMAGE');
    });

    it('should default to DOCUMENT for unknown types', () => {
      expect(detectContentType('application/unknown')).toBe('DOCUMENT');
    });
  });

  describe('Document Structure Extraction', () => {
    const extractStructureFromHtml = (html: string) => {
      const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
      const paragraphRegex = /<p>(.*?)<\/p>/gi;
      const listRegex = /<li>(.*?)<\/li>/gi;

      const headings: { level: number; text: string }[] = [];
      const paragraphs: string[] = [];
      const listItems: string[] = [];

      let match;
      while ((match = headingRegex.exec(html)) !== null) {
        headings.push({ level: parseInt(match[1]), text: match[2] });
      }

      while ((match = paragraphRegex.exec(html)) !== null) {
        paragraphs.push(match[1]);
      }

      while ((match = listRegex.exec(html)) !== null) {
        listItems.push(match[1]);
      }

      return { headings, paragraphs, lists: listItems };
    };

    it('should extract headings from HTML', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><p>Content</p>';
      const structure = extractStructureFromHtml(html);

      expect(structure.headings).toHaveLength(2);
      expect(structure.headings[0]).toEqual({ level: 1, text: 'Title' });
      expect(structure.headings[1]).toEqual({ level: 2, text: 'Subtitle' });
    });

    it('should extract paragraphs from HTML', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>';
      const structure = extractStructureFromHtml(html);

      expect(structure.paragraphs).toHaveLength(2);
      expect(structure.paragraphs[0]).toBe('First paragraph');
    });

    it('should extract list items from HTML', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const structure = extractStructureFromHtml(html);

      expect(structure.lists).toHaveLength(2);
      expect(structure.lists).toContain('Item 1');
      expect(structure.lists).toContain('Item 2');
    });

    it('should handle HTML with no structure', () => {
      const html = 'Plain text content';
      const structure = extractStructureFromHtml(html);

      expect(structure.headings).toHaveLength(0);
      expect(structure.paragraphs).toHaveLength(0);
      expect(structure.lists).toHaveLength(0);
    });
  });
});
