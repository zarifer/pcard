import {
  Drawer,
  Typography,
  Tag,
  Divider,
  Space,
  Button,
  Popconfirm,
} from "antd";
import { useShow, useDelete } from "@refinedev/core";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { CalendarEvent } from "../../interfaces/ievent";

dayjs.extend(utc);

export const CalendarShow = ({
  visible,
  onClose,
  eventId,
}: {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}) => {
  const { queryResult } = useShow<CalendarEvent>({
    resource: "calendar_events",
    id: eventId,
  });

  const { mutate: deleteOne, isLoading: deleting } = useDelete();
  const event = queryResult?.data?.data;

  if (!event) return null;

  const color = "#7c41f7";

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
          <Popconfirm
            title="Delete this event?"
            okText="Delete"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() =>
              deleteOne(
                {
                  resource: "calendar_events",
                  id: String(event.id),
                  mutationMode: "pessimistic",
                },
                { onSuccess: () => onClose() },
              )
            }
          >
            <Button danger>Delete</Button>
          </Popconfirm>
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
            {dayjs(event.date).format("YYYY-MM-DD")}
          </Tag>

          <Divider style={{ margin: "16px 0" }} />

          <div>
            <strong>Performed by:</strong>
            <div style={{ marginTop: 4 }}>{event.performedBy || "—"}</div>
          </div>

          <div>
            <strong>Performed at (UTC):</strong>
            <div style={{ marginTop: 4 }}>
              {event.performedAtUtc
                ? dayjs.utc(event.performedAtUtc).format("YYYY-MM-DD HH:mm")
                : "—"}
            </div>
          </div>

          <div>
            <strong>Description:</strong>
            <div style={{ marginTop: 4 }}>{event.description || "—"}</div>
          </div>
        </Space>
      </div>
    </Drawer>
  );
};
