import type { Meta, StoryObj } from '@storybook/react-vite';
import { FaqList } from './faq-list';

const meta: Meta<typeof FaqList> = {
  title: 'Marketing/FAQList',
  component: FaqList,
  args: {
    items: [
      {
        question: 'Làm thế nào để bắt đầu?',
        answer:
          'Cài tiện ích, mở cuộc họp trực tuyến và bật phụ đề. Bạn có thể xem bản dịch ngay trong cửa sổ cuộc họp.',
      },
      {
        question: 'Bản ghi có được lưu trữ không?',
        answer:
          'Bạn chủ động chọn nội dung cần lưu. Bản ghi minh họa này dùng cho Storybook; với cuộc họp thật, hãy kiểm tra cài đặt lưu trữ trước khi chia sẻ để đảm bảo mọi người tham gia đều hiểu cách dữ liệu được sử dụng.',
      },
      {
        question: 'Có thể dùng khi mạng không ổn định không?',
        answer: 'Phụ đề đang hiển thị vẫn có thể được đọc; một số tính năng xử lý có thể cần kết nối mạng ổn định.',
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof FaqList>;

export const Default: Story = {};

export const OneOpen: Story = {
  args: {
    items: [
      {
        question: 'Nội dung có thể dài hơn một dòng không?',
        answer: 'Có. Phần trả lời tự xuống dòng và không bị cắt trên màn hình nhỏ.',
      },
    ],
  },
  render: (args) => (
    <div className="max-w-xl">
      <FaqList {...args} />
    </div>
  ),
};
