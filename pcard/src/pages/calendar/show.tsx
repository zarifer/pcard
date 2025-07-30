import { useShow, useNavigation } from "@refinedev/core";
import { Drawer, Typography, Tag, Avatar, Divider, Space, Button } from "antd";
import dayjs from "dayjs";

export const CATEGORY_COLORS: Record<string, string> = {
  "Pre-test": "#6f42c1",
  "Main test": "#2fa7b9",
  "Post-test": "#f88020",
  Debug: "#e53e3e",
};

// Segédfüggvény a dátumkezeléshez
const getStartDate = (e: any) =>
  Array.isArray(e.date) ? dayjs(e.date[0]) : dayjs(e.date);

const getEndDate = (e: any) =>
  e.endDate
    ? dayjs(e.endDate)
    : Array.isArray(e.date)
      ? dayjs(e.date[1])
      : undefined;

export const CalendarShow = ({
  visible,
  onClose,
  eventId,
}: {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}) => {
  const { queryResult } = useShow({
    resource: "calendar",
    id: eventId,
  });

  const { edit } = useNavigation();
  const event = queryResult?.data?.data;

  if (!event) return null;

  const start = getStartDate(event);
  const end = getEndDate(event);
  const color = CATEGORY_COLORS[event.type] || "#808080";

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{event.title}</span>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              if (event.id) edit("calendar", event.id);
            }}
          >
            Edit
          </Button>
        </div>
      }
      placement="right"
      width={400}
      bodyStyle={{ padding: 0, background: "var(--card-bg)" }}
      closable={false}
    >
      <div style={{ padding: 32 }}>
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Typography.Title
            level={3}
            style={{ color, fontWeight: 800, margin: 0 }}
          >
            {event.title}
          </Typography.Title>

          <Tag
            color={color}
            style={{ fontWeight: 600, fontSize: 16, padding: "2px 14px" }}
          >
            {event.type}
          </Tag>

          <Divider style={{ margin: "16px 0" }} />

          <div>
            <strong>Date:</strong>
            <br />
            {start.isValid() && start.format("YYYY. MMM D. (ddd)")}
            {end && end.isValid() && <> – {end.format("YYYY. MMM D. (ddd)")}</>}
          </div>

          {event.participants && event.participants.length > 0 && (
            <div>
              <strong>Participants:</strong>
              <br />
              <Space>
                {event.participants.map((p: string, i: number) => (
                  <Avatar key={i} size="small">
                    {p[0]?.toUpperCase()}
                  </Avatar>
                ))}
              </Space>
            </div>
          )}

          {event.description && (
            <div>
              <strong>Description:</strong>
              <div style={{ marginTop: 4 }}>{event.description}</div>
            </div>
          )}
        </Space>
      </div>
    </Drawer>
  );
};
