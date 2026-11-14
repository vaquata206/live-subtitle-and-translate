import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductPreview } from './product-preview';

const meta: Meta<typeof ProductPreview> = {
  title: 'Marketing/ProductPreview',
  component: ProductPreview,
};

export default meta;
type Story = StoryObj<typeof ProductPreview>;

export const Default: Story = {};

export const NarrowScreen: Story = {
  render: () => (
    <div className="max-w-sm">
      <ProductPreview />
    </div>
  ),
};
