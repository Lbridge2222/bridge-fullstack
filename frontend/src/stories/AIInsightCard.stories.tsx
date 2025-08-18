import type { Meta, StoryObj } from "@storybook/react";
import { AIInsightCard } from "@/components/ui/ai-insight-card";
import { AlertCircle } from "lucide-react";

const meta: Meta<typeof AIInsightCard> = {
  title: "Components/AIInsightCard",
  component: AIInsightCard,
};

export default meta;
type Story = StoryObj<typeof AIInsightCard>;

export const Default: Story = {
  args: {
    icon: <AlertCircle size={16} />,
    title: "High-Value Leads Need Attention",
    description: "23 leads with 85+ AI scores haven’t been contacted in 3+ days",
    action: "Contact Now",
    impact: "+12 applications",
    type: "urgent",
  },
};