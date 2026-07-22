import { AlertOctagon, AlertTriangle, Info, type LucideIcon } from "lucide-react";

export type Classification = "blocker" | "bad" | "기타";

interface ClassificationStyle {
  label: string;
  icon: LucideIcon;
  badge: string;
  chip: string;
  bar: string;
  dot: string;
}

export const CLASSIFICATION_STYLE: Record<Classification, ClassificationStyle> = {
  blocker: {
    label: "치명적",
    icon: AlertOctagon,
    badge: "bg-risk-blocker text-white",
    chip: "border-risk-blocker/30 bg-risk-blocker/10 text-risk-blocker",
    bar: "bg-risk-blocker",
    dot: "bg-risk-blocker",
  },
  bad: {
    label: "위험",
    icon: AlertTriangle,
    badge: "bg-risk-bad text-white",
    chip: "border-risk-bad/30 bg-risk-bad/10 text-risk-bad",
    bar: "bg-risk-bad",
    dot: "bg-risk-bad",
  },
  기타: {
    label: "기타",
    icon: Info,
    badge: "bg-muted-foreground text-white",
    chip: "border-border bg-muted text-muted-foreground",
    bar: "bg-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

export const VERDICT_LABEL: Record<string, string> = {
  VALID: "매칭 타당",
  INVALID: "매칭 재검토 필요",
  SKIPPED_UNGROUNDED: "검증 스킵(원문 미확인)",
};
