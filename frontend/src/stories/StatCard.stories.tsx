// src/stories/StatCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import StatCard from '../components/StatCard'; // ✅ This path works if component is in src/components
import { FaChartLine } from 'react-icons/fa';

const meta: Meta<typeof StatCard> = {
  title: 'Components/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered', // 🔥 ADD THIS - Centers component in Storybook
  },
  tags: ['autodocs'], // 🔥 ADD THIS - Auto-generates docs
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    title: 'Active Users',
    value: 542,
    icon: <FaChartLine />,
  },
};

// 🔥 ADD MORE VARIANTS
export const Revenue: Story = {
  args: {
    title: 'Total Revenue',
    value: '$127,459',
    icon: <FaChartLine />,
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'Conversion Rate',
    value: '3.2%',
  },
};