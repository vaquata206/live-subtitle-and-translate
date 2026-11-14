import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarketingNavigation } from './marketing-navigation';

const meta: Meta<typeof MarketingNavigation> = {
  title: 'Marketing/Navigation',
  component: MarketingNavigation,
  args: {
    brand: 'Lắng Nghe',
    links: [
      { href: '#features', label: 'Tính năng' },
      { href: '#pricing', label: 'Bảng giá' },
      { href: '#faq', label: 'Câu hỏi thường gặp' },
    ],
    action: { href: '#start', label: 'Dùng thử miễn phí' },
  },
};

export default meta;
type Story = StoryObj<typeof MarketingNavigation>;

export const Default: Story = {};

export const NarrowScreen: Story = {
  render: (args) => (
    <div className="max-w-sm border bg-background">
      <MarketingNavigation {...args} />
    </div>
  ),
};
