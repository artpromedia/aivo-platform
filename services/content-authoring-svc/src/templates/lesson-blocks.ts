/**
 * Lesson Block Templates
 *
 * Defines all available block types, their schemas, and default configurations
 */

import type { BlockType } from '../types/lesson-builder.js';

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK SCHEMA DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface BlockTemplate {
  type: BlockType;
  category: 'text' | 'media' | 'interactive' | 'activity' | 'layout';
  label: string;
  description: string;
  icon: string;
  defaultContent: Record<string, any>;
  defaultSettings: Record<string, any>;
  schema: {
    content: Record<string, FieldSchema>;
    settings: Record<string, FieldSchema>;
  };
}

export interface FieldSchema {
  type: 'string' | 'text' | 'number' | 'boolean' | 'select' | 'array' | 'object';
  label: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  placeholder?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEXT BLOCKS
// ══════════════════════════════════════════════════════════════════════════════

const TEXT_PARAGRAPH: BlockTemplate = {
  type: 'TEXT_PARAGRAPH',
  category: 'text',
  label: 'Paragraph',
  description: 'Rich text paragraph',
  icon: 'FileText',
  defaultContent: {
    text: '<p>Enter your text here...</p>',
  },
  defaultSettings: {
    fontSize: 'medium',
    alignment: 'left',
  },
  schema: {
    content: {
      text: {
        type: 'text',
        label: 'Text Content',
        required: true,
        placeholder: 'Enter your text...',
      },
    },
    settings: {
      fontSize: {
        type: 'select',
        label: 'Font Size',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        default: 'medium',
      },
      alignment: {
        type: 'select',
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' },
        ],
        default: 'left',
      },
    },
  },
};

const TEXT_HEADING: BlockTemplate = {
  type: 'TEXT_HEADING',
  category: 'text',
  label: 'Heading',
  description: 'Section heading',
  icon: 'Heading',
  defaultContent: {
    text: 'Section Heading',
    level: 2,
  },
  defaultSettings: {
    alignment: 'left',
  },
  schema: {
    content: {
      text: {
        type: 'string',
        label: 'Heading Text',
        required: true,
      },
      level: {
        type: 'select',
        label: 'Heading Level',
        options: [
          { value: '1', label: 'H1' },
          { value: '2', label: 'H2' },
          { value: '3', label: 'H3' },
          { value: '4', label: 'H4' },
        ],
        default: '2',
      },
    },
    settings: {
      alignment: {
        type: 'select',
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        default: 'left',
      },
    },
  },
};

const TEXT_LIST: BlockTemplate = {
  type: 'TEXT_LIST',
  category: 'text',
  label: 'List',
  description: 'Bulleted or numbered list',
  icon: 'List',
  defaultContent: {
    items: ['Item 1', 'Item 2', 'Item 3'],
    listType: 'unordered',
  },
  defaultSettings: {},
  schema: {
    content: {
      items: {
        type: 'array',
        label: 'List Items',
        required: true,
      },
      listType: {
        type: 'select',
        label: 'List Type',
        options: [
          { value: 'unordered', label: 'Bulleted' },
          { value: 'ordered', label: 'Numbered' },
        ],
        default: 'unordered',
      },
    },
    settings: {},
  },
};

const TEXT_QUOTE: BlockTemplate = {
  type: 'TEXT_QUOTE',
  category: 'text',
  label: 'Quote',
  description: 'Highlighted quote or callout',
  icon: 'Quote',
  defaultContent: {
    text: 'Enter quote text here...',
    author: '',
  },
  defaultSettings: {
    style: 'default',
  },
  schema: {
    content: {
      text: {
        type: 'text',
        label: 'Quote Text',
        required: true,
      },
      author: {
        type: 'string',
        label: 'Author (optional)',
      },
    },
    settings: {
      style: {
        type: 'select',
        label: 'Style',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'bordered', label: 'Bordered' },
          { value: 'highlighted', label: 'Highlighted' },
        ],
        default: 'default',
      },
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MEDIA BLOCKS
// ══════════════════════════════════════════════════════════════════════════════

const MEDIA_IMAGE: BlockTemplate = {
  type: 'MEDIA_IMAGE',
  category: 'media',
  label: 'Image',
  description: 'Upload or link an image',
  icon: 'Image',
  defaultContent: {
    url: '',
    alt: '',
    caption: '',
  },
  defaultSettings: {
    size: 'medium',
    alignment: 'center',
  },
  schema: {
    content: {
      url: {
        type: 'string',
        label: 'Image URL',
        required: true,
      },
      alt: {
        type: 'string',
        label: 'Alt Text',
        required: true,
      },
      caption: {
        type: 'string',
        label: 'Caption (optional)',
      },
    },
    settings: {
      size: {
        type: 'select',
        label: 'Size',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
          { value: 'full', label: 'Full Width' },
        ],
        default: 'medium',
      },
      alignment: {
        type: 'select',
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        default: 'center',
      },
    },
  },
};

const MEDIA_VIDEO: BlockTemplate = {
  type: 'MEDIA_VIDEO',
  category: 'media',
  label: 'Video',
  description: 'Embed video content',
  icon: 'Video',
  defaultContent: {
    url: '',
    provider: 'youtube',
    title: '',
  },
  defaultSettings: {
    autoplay: false,
    controls: true,
  },
  schema: {
    content: {
      url: {
        type: 'string',
        label: 'Video URL',
        required: true,
      },
      provider: {
        type: 'select',
        label: 'Provider',
        options: [
          { value: 'youtube', label: 'YouTube' },
          { value: 'vimeo', label: 'Vimeo' },
          { value: 'custom', label: 'Custom URL' },
        ],
        default: 'youtube',
      },
      title: {
        type: 'string',
        label: 'Video Title',
      },
    },
    settings: {
      autoplay: {
        type: 'boolean',
        label: 'Autoplay',
        default: false,
      },
      controls: {
        type: 'boolean',
        label: 'Show Controls',
        default: true,
      },
    },
  },
};

const MEDIA_AUDIO: BlockTemplate = {
  type: 'MEDIA_AUDIO',
  category: 'media',
  label: 'Audio',
  description: 'Embed audio file',
  icon: 'Music',
  defaultContent: {
    url: '',
    title: '',
  },
  defaultSettings: {
    autoplay: false,
  },
  schema: {
    content: {
      url: {
        type: 'string',
        label: 'Audio URL',
        required: true,
      },
      title: {
        type: 'string',
        label: 'Audio Title',
      },
    },
    settings: {
      autoplay: {
        type: 'boolean',
        label: 'Autoplay',
        default: false,
      },
    },
  },
};

const MEDIA_EMBED: BlockTemplate = {
  type: 'MEDIA_EMBED',
  category: 'media',
  label: 'Embed',
  description: 'Embed external content',
  icon: 'Code',
  defaultContent: {
    embedCode: '',
    url: '',
  },
  defaultSettings: {
    height: 400,
  },
  schema: {
    content: {
      embedCode: {
        type: 'text',
        label: 'Embed Code',
      },
      url: {
        type: 'string',
        label: 'URL',
      },
    },
    settings: {
      height: {
        type: 'number',
        label: 'Height (px)',
        default: 400,
        min: 100,
        max: 1000,
      },
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// INTERACTIVE BLOCKS
// ══════════════════════════════════════════════════════════════════════════════

const QUIZ: BlockTemplate = {
  type: 'QUIZ',
  category: 'interactive',
  label: 'Quiz',
  description: 'Multiple choice or short answer quiz',
  icon: 'HelpCircle',
  defaultContent: {
    question: 'Enter your question here...',
    type: 'multiple_choice',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 0,
    explanation: '',
  },
  defaultSettings: {
    showFeedback: true,
    allowRetry: true,
  },
  schema: {
    content: {
      question: {
        type: 'text',
        label: 'Question',
        required: true,
      },
      type: {
        type: 'select',
        label: 'Question Type',
        options: [
          { value: 'multiple_choice', label: 'Multiple Choice' },
          { value: 'true_false', label: 'True/False' },
          { value: 'short_answer', label: 'Short Answer' },
        ],
        default: 'multiple_choice',
      },
      options: {
        type: 'array',
        label: 'Answer Options',
      },
      correctAnswer: {
        type: 'number',
        label: 'Correct Answer Index',
      },
      explanation: {
        type: 'text',
        label: 'Explanation (optional)',
      },
    },
    settings: {
      showFeedback: {
        type: 'boolean',
        label: 'Show Feedback',
        default: true,
      },
      allowRetry: {
        type: 'boolean',
        label: 'Allow Retry',
        default: true,
      },
    },
  },
};

const POLL: BlockTemplate = {
  type: 'POLL',
  category: 'interactive',
  label: 'Poll',
  description: 'Student polling/survey',
  icon: 'BarChart3',
  defaultContent: {
    question: 'What do you think?',
    options: ['Option 1', 'Option 2', 'Option 3'],
  },
  defaultSettings: {
    showResults: true,
    multipleChoice: false,
  },
  schema: {
    content: {
      question: {
        type: 'string',
        label: 'Poll Question',
        required: true,
      },
      options: {
        type: 'array',
        label: 'Poll Options',
        required: true,
      },
    },
    settings: {
      showResults: {
        type: 'boolean',
        label: 'Show Results',
        default: true,
      },
      multipleChoice: {
        type: 'boolean',
        label: 'Allow Multiple Selections',
        default: false,
      },
    },
  },
};

const FLASHCARD: BlockTemplate = {
  type: 'FLASHCARD',
  category: 'interactive',
  label: 'Flashcard',
  description: 'Interactive flashcards',
  icon: 'Layers',
  defaultContent: {
    cards: [
      { front: 'Term 1', back: 'Definition 1' },
      { front: 'Term 2', back: 'Definition 2' },
    ],
  },
  defaultSettings: {
    shuffle: false,
  },
  schema: {
    content: {
      cards: {
        type: 'array',
        label: 'Flashcards',
        required: true,
      },
    },
    settings: {
      shuffle: {
        type: 'boolean',
        label: 'Shuffle Cards',
        default: false,
      },
    },
  },
};

const DRAG_DROP: BlockTemplate = {
  type: 'DRAG_DROP',
  category: 'interactive',
  label: 'Drag & Drop',
  description: 'Drag and drop activity',
  icon: 'Move',
  defaultContent: {
    instruction: 'Drag items to the correct category',
    items: ['Item 1', 'Item 2', 'Item 3'],
    categories: ['Category A', 'Category B'],
    correctMatches: {},
  },
  defaultSettings: {},
  schema: {
    content: {
      instruction: {
        type: 'string',
        label: 'Instructions',
        required: true,
      },
      items: {
        type: 'array',
        label: 'Draggable Items',
        required: true,
      },
      categories: {
        type: 'array',
        label: 'Drop Zones',
        required: true,
      },
      correctMatches: {
        type: 'object',
        label: 'Correct Matches',
      },
    },
    settings: {},
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY BLOCKS
// ══════════════════════════════════════════════════════════════════════════════

const ACTIVITY_WORKSHEET: BlockTemplate = {
  type: 'ACTIVITY_WORKSHEET',
  category: 'activity',
  label: 'Worksheet',
  description: 'Practice worksheet',
  icon: 'FileEdit',
  defaultContent: {
    title: 'Practice Worksheet',
    instructions: 'Complete the following exercises...',
    questions: [],
  },
  defaultSettings: {
    timeLimit: null,
  },
  schema: {
    content: {
      title: {
        type: 'string',
        label: 'Worksheet Title',
        required: true,
      },
      instructions: {
        type: 'text',
        label: 'Instructions',
      },
      questions: {
        type: 'array',
        label: 'Questions',
      },
    },
    settings: {
      timeLimit: {
        type: 'number',
        label: 'Time Limit (minutes)',
        min: 0,
      },
    },
  },
};

const ACTIVITY_ASSIGNMENT: BlockTemplate = {
  type: 'ACTIVITY_ASSIGNMENT',
  category: 'activity',
  label: 'Assignment',
  description: 'Graded assignment',
  icon: 'Clipboard',
  defaultContent: {
    title: 'Assignment',
    instructions: 'Complete this assignment...',
    dueDate: null,
    points: 100,
  },
  defaultSettings: {
    allowLateSubmission: true,
  },
  schema: {
    content: {
      title: {
        type: 'string',
        label: 'Assignment Title',
        required: true,
      },
      instructions: {
        type: 'text',
        label: 'Instructions',
        required: true,
      },
      dueDate: {
        type: 'string',
        label: 'Due Date',
      },
      points: {
        type: 'number',
        label: 'Points Possible',
        default: 100,
      },
    },
    settings: {
      allowLateSubmission: {
        type: 'boolean',
        label: 'Allow Late Submissions',
        default: true,
      },
    },
  },
};

const ACTIVITY_DISCUSSION: BlockTemplate = {
  type: 'ACTIVITY_DISCUSSION',
  category: 'activity',
  label: 'Discussion',
  description: 'Discussion prompt',
  icon: 'MessageSquare',
  defaultContent: {
    prompt: 'Discuss the following question...',
    minimumWords: 0,
  },
  defaultSettings: {
    allowReplies: true,
  },
  schema: {
    content: {
      prompt: {
        type: 'text',
        label: 'Discussion Prompt',
        required: true,
      },
      minimumWords: {
        type: 'number',
        label: 'Minimum Words',
        default: 0,
        min: 0,
      },
    },
    settings: {
      allowReplies: {
        type: 'boolean',
        label: 'Allow Student Replies',
        default: true,
      },
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// LAYOUT BLOCKS
// ══════════════════════════════════════════════════════════════════════════════

const LAYOUT_COLUMNS: BlockTemplate = {
  type: 'LAYOUT_COLUMNS',
  category: 'layout',
  label: 'Columns',
  description: 'Multi-column layout',
  icon: 'Columns',
  defaultContent: {
    columns: [
      { content: 'Column 1 content' },
      { content: 'Column 2 content' },
    ],
  },
  defaultSettings: {
    columnCount: 2,
    gap: 'medium',
  },
  schema: {
    content: {
      columns: {
        type: 'array',
        label: 'Columns',
        required: true,
      },
    },
    settings: {
      columnCount: {
        type: 'number',
        label: 'Number of Columns',
        default: 2,
        min: 2,
        max: 4,
      },
      gap: {
        type: 'select',
        label: 'Gap Size',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        default: 'medium',
      },
    },
  },
};

const LAYOUT_DIVIDER: BlockTemplate = {
  type: 'LAYOUT_DIVIDER',
  category: 'layout',
  label: 'Divider',
  description: 'Horizontal divider line',
  icon: 'Minus',
  defaultContent: {},
  defaultSettings: {
    style: 'solid',
    spacing: 'medium',
  },
  schema: {
    content: {},
    settings: {
      style: {
        type: 'select',
        label: 'Style',
        options: [
          { value: 'solid', label: 'Solid' },
          { value: 'dashed', label: 'Dashed' },
          { value: 'dotted', label: 'Dotted' },
        ],
        default: 'solid',
      },
      spacing: {
        type: 'select',
        label: 'Spacing',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        default: 'medium',
      },
    },
  },
};

const LAYOUT_CALLOUT: BlockTemplate = {
  type: 'LAYOUT_CALLOUT',
  category: 'layout',
  label: 'Callout',
  description: 'Highlighted callout box',
  icon: 'AlertCircle',
  defaultContent: {
    text: 'Important information...',
    title: '',
  },
  defaultSettings: {
    type: 'info',
  },
  schema: {
    content: {
      text: {
        type: 'text',
        label: 'Callout Text',
        required: true,
      },
      title: {
        type: 'string',
        label: 'Title (optional)',
      },
    },
    settings: {
      type: {
        type: 'select',
        label: 'Type',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'warning', label: 'Warning' },
          { value: 'success', label: 'Success' },
          { value: 'error', label: 'Error' },
        ],
        default: 'info',
      },
    },
  },
};

const LAYOUT_ACCORDION: BlockTemplate = {
  type: 'LAYOUT_ACCORDION',
  category: 'layout',
  label: 'Accordion',
  description: 'Expandable sections',
  icon: 'ChevronDown',
  defaultContent: {
    sections: [
      { title: 'Section 1', content: 'Content 1' },
      { title: 'Section 2', content: 'Content 2' },
    ],
  },
  defaultSettings: {
    allowMultiple: false,
    defaultExpanded: false,
  },
  schema: {
    content: {
      sections: {
        type: 'array',
        label: 'Accordion Sections',
        required: true,
      },
    },
    settings: {
      allowMultiple: {
        type: 'boolean',
        label: 'Allow Multiple Open',
        default: false,
      },
      defaultExpanded: {
        type: 'boolean',
        label: 'Expand First Section',
        default: false,
      },
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const BLOCK_TEMPLATES: Record<BlockType, BlockTemplate> = {
  // Text
  TEXT_PARAGRAPH,
  TEXT_HEADING,
  TEXT_LIST,
  TEXT_QUOTE,
  // Media
  MEDIA_IMAGE,
  MEDIA_VIDEO,
  MEDIA_AUDIO,
  MEDIA_EMBED,
  // Interactive
  QUIZ,
  POLL,
  FLASHCARD,
  DRAG_DROP,
  // Activity
  ACTIVITY_WORKSHEET,
  ACTIVITY_ASSIGNMENT,
  ACTIVITY_DISCUSSION,
  // Layout
  LAYOUT_COLUMNS,
  LAYOUT_DIVIDER,
  LAYOUT_CALLOUT,
  LAYOUT_ACCORDION,
};

export const BLOCK_CATEGORIES = {
  text: [TEXT_PARAGRAPH, TEXT_HEADING, TEXT_LIST, TEXT_QUOTE],
  media: [MEDIA_IMAGE, MEDIA_VIDEO, MEDIA_AUDIO, MEDIA_EMBED],
  interactive: [QUIZ, POLL, FLASHCARD, DRAG_DROP],
  activity: [ACTIVITY_WORKSHEET, ACTIVITY_ASSIGNMENT, ACTIVITY_DISCUSSION],
  layout: [LAYOUT_COLUMNS, LAYOUT_DIVIDER, LAYOUT_CALLOUT, LAYOUT_ACCORDION],
};

export function getBlockTemplate(type: BlockType): BlockTemplate {
  return BLOCK_TEMPLATES[type];
}

export function getBlocksByCategory(category: keyof typeof BLOCK_CATEGORIES): BlockTemplate[] {
  return BLOCK_CATEGORIES[category] || [];
}
