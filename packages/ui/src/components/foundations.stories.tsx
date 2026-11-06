import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, LiveBadge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input, Label } from './input';

const meta: Meta = { title: 'Foundations/Components' };
export default meta;

export const Buttons: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>Bắt đầu miễn phí</Button>
      <Button variant="secondary">Xem demo</Button>
      <Button variant="outline">Huỷ</Button>
      <Button variant="ghost">Bỏ qua</Button>
      <Button variant="destructive">Xoá cuộc họp</Button>
      <Button variant="link">Tìm hiểu thêm</Button>
      <Button size="sm">Nhỏ</Button>
      <Button size="lg">Lớn</Button>
      <Button disabled>Đang xử lý…</Button>
    </div>
  ),
};

export const Badges: StoryObj = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <LiveBadge />
      <Badge>Pro</Badge>
      <Badge variant="secondary">Tiếng Việt</Badge>
      <Badge variant="outline">Đã kết thúc</Badge>
      <Badge variant="success">Đã đồng bộ</Badge>
    </div>
  ),
};

export const ShareCard: StoryObj = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Chia sẻ cuộc họp</CardTitle>
        <CardDescription>Người có link và mã PIN có thể xem phụ đề trực tiếp.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="share-link">Link</Label>
          <Input id="share-link" readOnly value="https://app.example.com/m/k7Qp2xVb9LmZ" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="share-pin">Mã PIN</Label>
          <Input id="share-pin" readOnly value="482913" className="font-mono tracking-[0.3em]" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Sao chép link</Button>
        <Button variant="outline">Đổi PIN</Button>
      </CardFooter>
    </Card>
  ),
};
