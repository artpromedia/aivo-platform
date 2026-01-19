import type { Meta, StoryObj } from '@storybook/react';
import { SubjectCard } from './SubjectCard';
import type { SubjectInfo } from '../../types';

const sampleSubject: SubjectInfo = {
  id: 'math',
  name: 'Math',
  emoji: '🧮',
  color: 'from-blue-500 to-cyan-500',
};

const meta: Meta<typeof SubjectCard> = {
  title: 'Components/SubjectCard',
  component: SubjectCard,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Card size variant',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the card is selected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SubjectCard>;

export const Default: Story = {
  args: {
    subject: sampleSubject,
    onClick: (id) => console.log('Clicked:', id),
  },
};

export const Selected: Story = {
  args: {
    ...Default.args,
    selected: true,
  },
};

export const Small: Story = {
  args: {
    ...Default.args,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'lg',
  },
};

export const SubjectGrid: Story = {
  render: () => {
    const subjects: SubjectInfo[] = [
      { id: 'math', name: 'Math', emoji: '🧮', color: 'from-blue-500 to-cyan-500' },
      { id: 'reading', name: 'Reading', emoji: '📚', color: 'from-purple-500 to-pink-500' },
      { id: 'science', name: 'Science', emoji: '🔬', color: 'from-green-500 to-emerald-500' },
      { id: 'art', name: 'Art', emoji: '🎨', color: 'from-orange-500 to-red-500' },
    ];
    return (
      <div className="grid grid-cols-4 gap-3">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onClick={(id) => console.log('Selected:', id)}
          />
        ))}
      </div>
    );
  },
};
