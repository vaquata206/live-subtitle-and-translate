export type MarketingLink = Readonly<{
  href: string;
  label: string;
}>;

export type MarketingItem = Readonly<{
  id: string;
  title: string;
  description: string;
}>;

export type MarketingFaq = Readonly<{
  question: string;
  answer: string;
}>;

export type DemoPlan = Readonly<{
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  features: readonly string[];
  highlighted: boolean;
  cta: MarketingLink;
}>;

export type MarketingContent = Readonly<{
  brand: string;
  tagline: string;
  headline: string;
  description: string;
  primaryCta: MarketingLink;
  secondaryCta: MarketingLink;
  repositoryHref: string;
  pricingDisclaimer: string;
  previewDisclaimer: string;
  privacyNote: string;
  roadmapNote: string;
  sidepanelNote: string;
  installation: Readonly<{
    title: string;
    description: string;
    steps: readonly string[];
  }>;
}>;

export const marketing: MarketingContent = {
  brand: 'Live Subtitles',
  tagline: 'Phụ đề, dịch song ngữ và biên bản trong Chrome.',
  headline: 'Nghe trọn ý. Không bỏ lỡ điều quan trọng.',
  description:
    'Theo dõi âm thanh từ tab bằng phụ đề và bản dịch song ngữ. Tóm tắt khi cần, chỉnh sửa biên bản rồi xuất DOCX.',
  primaryCta: { label: 'Hướng dẫn cài tiện ích', href: '#cai-dat' },
  secondaryCta: { label: 'Xem bản mô phỏng', href: '#trai-nghiem' },
  repositoryHref: 'https://github.com/vaquata206/live-subtitle-and-translate',
  pricingDisclaimer: 'Gói cước và mức giá minh họa, chưa áp dụng thanh toán.',
  previewDisclaimer: 'Bản xem trước dùng nội dung mô phỏng, không thu âm hay kết nối dịch vụ AI.',
  privacyNote:
    'Dữ liệu được lưu trong trình duyệt, không đồng nghĩa AI chạy ngoại tuyến. Khi dùng khóa API riêng (BYOK), nhận dạng giọng nói, dịch và tóm tắt cần mạng để kết nối nhà cung cấp đã chọn; phí sử dụng do nhà cung cấp tính.',
  roadmapNote: 'AI do nền tảng cung cấp và chia sẻ trực tiếp lên web đang được phát triển, chưa khả dụng.',
  sidepanelNote: 'Chrome quyết định vị trí bảng bên; tiện ích không tự đặt bảng bên sang trái hoặc phải.',
  installation: {
    title: 'Cài tiện ích từ mã nguồn',
    description: 'Hiện cài từ kho mã nguồn GitHub, không qua nút cài Chrome Web Store hay đăng ký tài khoản.',
    steps: [
      'Mở kho mã nguồn và làm theo hướng dẫn build, đóng gói tiện ích.',
      'Mở chrome://extensions, bật Chế độ dành cho nhà phát triển và tải thư mục tiện ích đã build.',
      'Thiết lập khóa API của bạn, mở tab có âm thanh rồi bắt đầu phụ đề.',
    ],
  },
};

export const navigation: readonly MarketingLink[] = [
  { href: '#tinh-nang', label: 'Tính năng' },
  { href: '#cach-dung', label: 'Cách dùng' },
  { href: '#goi-cuoc', label: 'Gói cước minh họa' },
  { href: '#cau-hoi', label: 'Câu hỏi thường gặp' },
];

export const useCases: readonly MarketingItem[] = [
  {
    id: 'meetings',
    title: 'Cuộc họp nhiều ngôn ngữ',
    description: 'Đọc phụ đề và bản dịch song song để theo kịp nội dung trao đổi.',
  },
  {
    id: 'learning',
    title: 'Bài giảng và video',
    description: 'Theo dõi lời nói trên tab, xem lại câu gốc khi bản dịch cần đối chiếu.',
  },
  {
    id: 'notes',
    title: 'Ghi chép sau buổi họp',
    description: 'Tạo biên bản từ bản ghi, rà soát rồi xuất DOCX để tiếp tục chỉnh sửa.',
  },
];

export const features: readonly MarketingItem[] = [
  {
    id: 'captions',
    title: 'Phụ đề từ âm thanh tab',
    description: 'Xem lời nói dưới dạng văn bản trong bảng bên của Chrome khi theo dõi cuộc họp hoặc video.',
  },
  {
    id: 'translation',
    title: 'Dịch song ngữ để đối chiếu',
    description: 'Giữ câu gốc cạnh bản dịch; chất lượng phụ thuộc âm thanh và nhà cung cấp AI.',
  },
  {
    id: 'summary',
    title: 'Tóm tắt khi bạn yêu cầu',
    description: 'Tóm tắt mặc định tắt. Chỉ bật khi cần gom các ý chính từ nội dung đã ghi.',
  },
  {
    id: 'minutes',
    title: 'Biên bản có thể chỉnh sửa',
    description: 'Rà soát và sửa nội dung biên bản trước khi xuất tệp DOCX.',
  },
];

export const steps: readonly MarketingItem[] = [
  {
    id: 'install',
    title: 'Cài và thiết lập',
    description: 'Cài tiện ích từ mã nguồn, nhập khóa API riêng cho các dịch vụ bạn muốn dùng.',
  },
  {
    id: 'listen',
    title: 'Mở tab, bắt đầu phụ đề',
    description: 'Chọn tab có âm thanh, mở tiện ích và theo dõi phụ đề cùng bản dịch.',
  },
  {
    id: 'review',
    title: 'Rà soát và lưu biên bản',
    description: 'Yêu cầu tóm tắt nếu cần, chỉnh sửa biên bản và xuất DOCX.',
  },
];

export const faqs: readonly MarketingFaq[] = [
  {
    question: 'Có cần tài khoản để dùng tiện ích không?',
    answer:
      'Không cần tài khoản để dùng tiện ích với dữ liệu lưu trong trình duyệt. Bạn tự thiết lập khóa API cho các dịch vụ AI muốn sử dụng.',
  },
  {
    question: 'Lưu trong trình duyệt có nghĩa là AI hoạt động ngoại tuyến?',
    answer: marketing.privacyNote,
  },
  {
    question: 'Tóm tắt có tự chạy trong mọi cuộc họp không?',
    answer:
      'Không. Tóm tắt mặc định tắt và chỉ chạy khi bạn yêu cầu. Hãy kiểm tra nội dung AI tạo trước khi dùng biên bản.',
  },
  {
    question: 'Có thể chuyển bảng bên sang trái hoặc phải không?',
    answer: marketing.sidepanelNote,
  },
  {
    question: 'Đã có AI tích hợp và chia sẻ trực tiếp lên web chưa?',
    answer: marketing.roadmapNote,
  },
  {
    question: 'Các gói trên trang đã mua được chưa?',
    answer: `${marketing.pricingDisclaimer} Các quyền lợi phía máy chủ được đề xuất đều là tính năng sắp có, chưa được cấp qua trang này.`,
  },
];

export const demoPlans: readonly DemoPlan[] = [
  {
    id: 'personal',
    name: 'Cá nhân',
    description: 'Gói minh họa cho người dùng tiện ích với khóa API riêng.',
    price: '0đ',
    period: '/tháng',
    features: [
      'Phụ đề và dịch với khóa API riêng; phí nhà cung cấp tính riêng',
      'Tóm tắt theo yêu cầu, mặc định tắt',
      'Chỉnh sửa biên bản và xuất DOCX',
      'Quyền lợi máy chủ dự kiến (sắp có): gói cơ bản, không gồm AI do nền tảng cung cấp',
    ],
    highlighted: false,
    cta: { label: 'Xem hướng dẫn cài', href: '#cai-dat' },
  },
  {
    id: 'professional',
    name: 'Chuyên nghiệp',
    description: 'Gói minh họa cho nhu cầu AI do nền tảng cung cấp trong tương lai.',
    price: '149.000đ',
    period: '/tháng',
    features: [
      'Các tính năng tiện ích của gói Cá nhân',
      'Quyền lợi máy chủ dự kiến (sắp có): AI do nền tảng cung cấp',
      'Quyền lợi máy chủ dự kiến (sắp có): hạn mức sử dụng theo gói, chưa công bố',
    ],
    highlighted: true,
    cta: { label: 'Đọc lưu ý về gói minh họa', href: '#cau-hoi' },
  },
  {
    id: 'team',
    name: 'Nhóm',
    description: 'Gói minh họa cho nhu cầu cộng tác, chưa mở đăng ký.',
    price: '499.000đ',
    period: '/tháng',
    features: [
      'Các tính năng tiện ích của gói Cá nhân',
      'Quyền lợi máy chủ dự kiến (sắp có): AI do nền tảng cung cấp',
      'Quyền lợi máy chủ dự kiến (sắp có): chia sẻ trực tiếp lên web',
      'Quyền lợi máy chủ dự kiến (sắp có): quản lý nhóm, chưa công bố hạn mức',
    ],
    highlighted: false,
    cta: { label: 'Đọc lưu ý về gói minh họa', href: '#cau-hoi' },
  },
];

export const landingCopy = {
  skipLink: 'Chuyển đến nội dung chính',
  navigationCta: 'Cài tiện ích',
  useCasesTitle: 'Một tab đang phát. Nhiều cách để theo kịp.',
  featuresTitle: 'Từ lời nói đến bản ghi dùng được.',
  featuresDescription: 'Đọc để hiểu ngay trong buổi trao đổi. Giữ lại phần quan trọng để tiếp tục công việc sau đó.',
  previewTitle: 'Xem phụ đề và tóm tắt cạnh nhau',
  previewCaption: 'Câu gốc để đối chiếu. Bản dịch để theo kịp. Ý chính để xem lại.',
  workflowTitle: 'Bắt đầu từ tab bạn đang nghe.',
  workflowDescription: 'Không cần tạo tài khoản. Bạn chọn dịch vụ AI và tự quản lý khóa API của mình.',
  workflowCaptureNote:
    'Trên tab có âm thanh, bấm biểu tượng tiện ích trên thanh công cụ để mở bảng bên và cấp quyền cho tab, rồi bấm “Bắt đầu”. Với tab mới, hãy bấm biểu tượng tiện ích trên tab đó trước.',
  roadmapBadge: 'Sắp ra mắt',
  roadmapTitle: 'Chia sẻ lên web. AI do nền tảng cung cấp.',
  pricingTitle: 'Các gói dự kiến, để bạn tham khảo.',
  pricingDescription:
    'Bạn có thể cài tiện ích và dùng khóa API riêng ngay hôm nay. Các quyền lợi máy chủ dưới đây chưa được mở bán hay cấp quyền.',
  faqTitle: 'Hiểu rõ trước khi bắt đầu.',
  faqDescription: 'Về dữ liệu, dịch vụ AI và những gì tiện ích hiện làm được.',
  installationRequirements:
    'Chuẩn bị Node.js 22+, Git và Chrome 116+. Chạy lệnh từ thư mục gốc của kho mã nguồn. Nếu chưa có pnpm qua Corepack, xem hướng dẫn trong README.',
  repositoryLabel: 'Mở kho mã nguồn trên GitHub',
  readmeLabel: 'Đọc hướng dẫn cài pnpm trong README',
  installSteps: [
    {
      title: 'Tải mã nguồn và build tiện ích',
      description:
        'Sao chép kho mã nguồn, cài các gói phụ thuộc rồi build riêng tiện ích; không cần chạy cơ sở dữ liệu hay nền tảng web.',
    },
    {
      title: 'Nạp tiện ích vào Chrome',
      description:
        'Sao chép địa chỉ bên dưới vào thanh địa chỉ Chrome. Bật “Chế độ dành cho nhà phát triển” (Developer mode), chọn “Tải tiện ích đã giải nén” (Load unpacked), rồi chọn thư mục apps\\extension\\dist trong kho mã nguồn vừa build.',
    },
    {
      title: 'Thiết lập dịch vụ của bạn',
      description:
        'Mở Cài đặt của tiện ích, nhập khóa Deepgram và kiểm tra kết nối. Chọn ngôn ngữ và dịch vụ dịch; thiết lập dịch vụ tóm tắt riêng nếu cần dùng.',
    },
    {
      title: 'Bấm biểu tượng tiện ích, rồi “Bắt đầu”',
      description:
        'Mở tab đang phát âm thanh và bấm biểu tượng tiện ích trên chính tab đó để mở bảng bên, cấp quyền ghi âm tab. Sau đó bấm “Bắt đầu”. Bấm “Dừng” khi kết thúc.',
    },
  ],
  buildCommands:
    'git clone https://github.com/vaquata206/live-subtitle-and-translate.git\ncd live-subtitle-and-translate\ncorepack pnpm install\ncorepack pnpm --filter @lst/extension build',
  extensionsAddress: 'chrome://extensions',
  finalTitle: 'Buổi trao đổi tiếp theo, theo kịp từng ý.',
  finalDescription: 'Cài tiện ích, thiết lập dịch vụ của bạn và bắt đầu ngay trên tab có âm thanh.',
  footerNote: 'Phụ đề và biên bản trong trình duyệt. Không cần tài khoản để dùng tiện ích.',
} as const;
