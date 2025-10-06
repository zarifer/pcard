export type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  performedBy?: string | null;
  performedAtUtc?: string | null;
  description?: string | null;
};

export type IEvent = CalendarEvent;
