import type { Meta, StoryObj } from '@storybook/react-vite';
import { PricingCard } from './pricing-card';

const meta: Meta<typeof PricingCard> = {
  title: 'Marketing/PricingCard',
  component: PricingCard,
  args: {
    name: 'Nhóm',
    description: 'Cho nhóm thường xuyên họp song ngữ.',
    price: '199.000₫',
    period: 'người dùng / tháng',
    features: [
      'Phụ đề và bản dịch theo thời gian thực',
      'Tóm tắt cùng danh sách quyết định',
      'Chia sẻ ghi chú cuộc họp an toàn',
    ],
    cta: { label: 'Chọn gói Nhóm', href: '#team-plan' },
  },
};

export default meta;
type Story = StoryObj<typeof PricingCard>;

export const Default: Story = {};
export const Recommended: Story = { args: { highlighted: true } };

export const PlanComparison: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-3">
      <PricingCard
        name="Cá nhân"
        description="Dành cho các cuộc họp gọn nhẹ."
        price="Miễn phí"
        period="luôn luôn"
        features={['Phụ đề song ngữ', 'Ghi chú cơ bản']}
        cta={{ label: 'Bắt đầu miễn phí', href: '#free-plan' }}
      />
      <PricingCard
        name="Nhóm"
        description="Cho nhóm thường xuyên họp song ngữ."
        price="199.000₫"
        period="người dùng / tháng"
        features={[
          'Phụ đề và bản dịch theo thời gian thực',
          'Tóm tắt cùng danh sách quyết định',
          'Chia sẻ ghi chú cuộc họp an toàn',
        ]}
        highlighted
        cta={{ label: 'Chọn gói Nhóm', href: '#team-plan' }}
      />
      <PricingCard
        name="Tổ chức"
        description="Tùy chỉnh theo quy trình và chính sách lưu trữ của tổ chức."
        price="Liên hệ"
        period="để nhận tư vấn"
        features={['Thiết lập linh hoạt', 'Hỗ trợ triển khai']}
        cta={{ label: 'Trao đổi với chúng tôi', href: '#contact' }}
      />
    </div>
  ),
};
