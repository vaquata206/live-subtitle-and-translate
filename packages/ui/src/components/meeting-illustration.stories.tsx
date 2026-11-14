import type { Meta, StoryObj } from '@storybook/react-vite';
import { MeetingIllustration } from './meeting-illustration';

const meta: Meta<typeof MeetingIllustration> = {
  title: 'Marketing/MeetingIllustration',
  component: MeetingIllustration,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof MeetingIllustration>;

export const Default: Story = {};
export const NarrowScreen: Story = {
  render: () => <MeetingIllustration className="max-w-xs" />,
};
