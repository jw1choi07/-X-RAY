export interface CollectionScheduleConfig {
  [source: string]: string;
}

const DEFAULT_SCHEDULES: CollectionScheduleConfig = {
  "government-notices": "daily",
  "preset": "weekly",
  default: "daily",
};

export function getCollectionSchedule(source: string): string {
  return DEFAULT_SCHEDULES[source] ?? DEFAULT_SCHEDULES.default;
}

export function setCollectionSchedule(source: string, schedule: string): void {
  DEFAULT_SCHEDULES[source] = schedule;
}
