import type { Meta, StoryObj } from "@storybook/react";
import { UrgentActionCard } from "@/components/urgent-action-card";

const meta: Meta<typeof UrgentActionCard> = {
  title: "Components/UrgentActionCard",
  component: UrgentActionCard,
};

export default meta;
type Story = StoryObj<typeof UrgentActionCard>;

export const Default: Story = {
  args: {
    name: "Sarah Mitchell",
    type: "Hot Lead",
    course: "Music Production",
    campus: "Brighton",
    score: 94,
    probability: 89,
    action: "Call within 2 hours",
    value: "£9,250",
  },
};