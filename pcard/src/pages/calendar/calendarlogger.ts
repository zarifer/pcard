import { useCreate, useGetIdentity } from "@refinedev/core";

export type CalendarEventPayload = {
  title: string;
  description: string;
  dateIso?: string;
  performedAtUtcIso?: string;
};

export const useCalendarLogger = () => {
  const { mutate } = useCreate();
  const { data: identity } = useGetIdentity<any>();

  const log = (p: CalendarEventPayload) => {
    const now = new Date().toISOString();
    mutate({
      resource: "calendar_events",
      values: {
        title: p.title,
        date: p.dateIso ?? now,
        performedBy: identity?.email ?? "",
        performedAtUtc: p.performedAtUtcIso ?? now,
        description: p.description,
      },
      successNotification: false,
    });
  };

  return { log };
};
