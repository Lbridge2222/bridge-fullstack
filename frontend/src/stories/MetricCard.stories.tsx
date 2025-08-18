import type { Meta, StoryObj } from "@storybook/react";
import { MetricCard } from "../components/metric-card";
import { Users } from "lucide-react";

const meta: Meta<typeof MetricCard> = {
  title: "Components/MetricCard",
  component: MetricCard,
  tags: ["autodocs"], // Enables auto-generated docs in Storybook
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = {
  args: {
    title: "Total Leads",
    value: "1,247",
    change: 12.5,
    icon: <Users className="text-blue-600" size={20} />,
    subtitle: "Active in pipeline",
    color: "blue",
  },
};

export const NegativeChange: Story = {
  args: {
    title: "Applications",
    value: "523",
    change: -3.2,
    icon: <Users className="text-green-600" size={20} />,
    subtitle: "Submitted this cycle",
    color: "green",
  },
};

export const NoChange: Story = {
  args: {
    title: "Offers Sent",
    value: "445",
    change: 0,
    icon: <Users className="text-purple-600" size={20} />,
    subtitle: "Awaiting responses",
    color: "purple",
  },
};