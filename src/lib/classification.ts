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
    badge: "bg-red-600 text-white",
    chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  bad: {
    label: "위험",
    icon: AlertTriangle,
    badge: "bg-orange-500 text-white",
    chip: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-400",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
  },
  기타: {
    label: "기타",
    icon: Info,
    badge: "bg-neutral-400 text-white",
    chip: "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
    bar: "bg-neutral-400",
    dot: "bg-neutral-400",
  },
};

export const VERDICT_LABEL: Record<string, string> = {
  VALID: "매칭 타당",
  INVALID: "매칭 재검토 필요",
  SKIPPED_UNGROUNDED: "검증 스킵(원문 미확인)",
};
