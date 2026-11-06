import type { Meta, StoryObj } from '@storybook/react-vite';
import { TranscriptSegment } from './transcript-segment';

const meta: Meta<typeof TranscriptSegment> = {
  title: 'Meeting/TranscriptSegment',
  component: TranscriptSegment,
  args: {
    speaker: 'Lan',
    speakerIndex: 0,
    time: '00:12',
    text: 'QA found two critical bugs in the payment flow, so I suggest moving the launch to the 20th.',
    translation: 'QA phát hiện hai lỗi nghiêm trọng ở luồng thanh toán, nên tôi đề xuất lùi ngày ra mắt sang ngày 20.',
    translationLang: 'vi',
  },
  argTypes: { mode: { control: 'inline-radio', options: ['bilingual', 'original', 'translation'] } },
};
export default meta;

type Story = StoryObj<typeof TranscriptSegment>;

export const Bilingual: Story = {};
export const TranslationOnly: Story = { args: { mode: 'translation' } };

export const Conversation: Story = {
  render: () => (
    <div className="max-w-xl">
      <TranscriptSegment
        speaker="Lan"
        speakerIndex={0}
        time="00:05"
        text="Good morning everyone."
        translation="Chào buổi sáng mọi người."
        translationLang="vi"
      />
      <TranscriptSegment
        continued
        text="Today we decide the launch date."
        translation="Hôm nay chúng ta chốt ngày ra mắt."
        translationLang="vi"
      />
      <TranscriptSegment
        speaker="Minh"
        speakerIndex={1}
        time="00:15"
        text="I suggest the 20th."
        translation="Tôi đề xuất ngày 20."
        translationLang="vi"
      />
      <TranscriptSegment
        speaker="Speaker 3"
        speakerIndex={2}
        time="00:45"
        text="Tôi sẽ gửi kế hoạch marketing ngày mai."
      />
    </div>
  ),
};
