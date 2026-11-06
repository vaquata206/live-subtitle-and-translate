export interface MinutesLabels {
  docTitle: string;
  date: string;
  time: string;
  duration: string;
  minutes: string;
  participants: string;
  source: string;
  summary: string;
  topics: string;
  decisions: string;
  actionItems: string;
  no: string;
  task: string;
  owner: string;
  due: string;
  openQuestions: string;
  nextSteps: string;
  transcript: string;
  generatedBy: string;
  page: string;
  none: string;
}

const VI: MinutesLabels = {
  docTitle: 'BIÊN BẢN CUỘC HỌP',
  date: 'Ngày',
  time: 'Thời gian',
  duration: 'Thời lượng',
  minutes: 'phút',
  participants: 'Thành phần tham dự',
  source: 'Nguồn',
  summary: 'Tóm tắt',
  topics: 'Nội dung thảo luận',
  decisions: 'Quyết định / Kết luận',
  actionItems: 'Công việc cần thực hiện',
  no: 'STT',
  task: 'Nội dung công việc',
  owner: 'Người phụ trách',
  due: 'Thời hạn',
  openQuestions: 'Vấn đề còn tồn đọng',
  nextSteps: 'Bước tiếp theo',
  transcript: 'Phụ lục: Nội dung ghi lời cuộc họp',
  generatedBy: 'Biên bản được tạo tự động từ phụ đề cuộc họp, vui lòng rà soát trước khi phát hành.',
  page: 'Trang',
  none: '(không có)',
};

const EN: MinutesLabels = {
  docTitle: 'MEETING MINUTES',
  date: 'Date',
  time: 'Time',
  duration: 'Duration',
  minutes: 'min',
  participants: 'Attendees',
  source: 'Source',
  summary: 'Summary',
  topics: 'Discussion',
  decisions: 'Decisions',
  actionItems: 'Action items',
  no: '#',
  task: 'Task',
  owner: 'Owner',
  due: 'Due',
  openQuestions: 'Open questions',
  nextSteps: 'Next steps',
  transcript: 'Appendix: Transcript',
  generatedBy: 'These minutes were generated automatically from live captions; please review before sharing.',
  page: 'Page',
  none: '(none)',
};

export function minutesLabels(language: string): MinutesLabels {
  return language.toLowerCase().startsWith('vi') ? VI : EN;
}
