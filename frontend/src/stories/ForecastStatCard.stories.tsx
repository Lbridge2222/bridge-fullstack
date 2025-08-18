import { ForecastStatCard } from "@/components/ForecastStatCard";
import { Brain, TrendingUp, Target, DollarSign } from "lucide-react";

export default {
  title: "Components/ForecastStatCard",
  component: ForecastStatCard,
};

export const Applications = {
  args: {
    icon: <TrendingUp size={20} />,
    title: "Applications Predicted",
    value: 67,
    subtitle: "Next 7 days",
    footnote: "ML confidence: 89%",
    color: "green"
  }
};

export const Enrolment = {
  args: {
    icon: <Target size={20} />,
    title: "Enrollment Forecast",
    value: 398,
    subtitle: "Final projection",
    footnote: "Target: 445 (-47)",
    color: "orange"
  }
};

export const Revenue = {
  args: {
    icon: <DollarSign size={20} />,
    title: "Revenue Impact",
    value: "£3.65M",
    subtitle: "Projected total",
    footnote: "At-risk: £420k",
    color: "blue"
  }
};