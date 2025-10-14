import { useList } from "@refinedev/core";
import { Badge, Calendar, Button, Space, Tabs } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { CalendarShow } from "./show";
import "./index.css";
import type { CalendarEvent } from "../../interfaces/ievent";

type ViewMode = "month" | "week";

const sanitizeCsv = (v: any) => {
  const s = String(v ?? "");
  const escaped = s.replace(/"/g, '""').replace(/\r?\n/g, " ");
  const dangerous = /^[=+\-@]/.test(escaped);
  return `"${dangerous ? "'" + escaped : escaped}"`;
};

export default function CalendarList() {
  const { data } = useList<CalendarEvent>({
    resource: "calendar_events",
    config: { pagination: { pageSize: 2000 } },
  });

  const events = data?.data ?? [];
  const [mode, setMode] = useState<ViewMode>("month");
  const [value, setValue] = useState<Dayjs>(dayjs());
  const [showId, setShowId] = useState<string | null>(null);

  const years: number[] = [];
  const thisYear = dayjs().year();
  for (let y = thisYear - 5; y <= thisYear + 5; y++) years.push(y);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const handlePrev = () =>
    setValue(
      mode === "month" ? value.subtract(1, "month") : value.subtract(1, "week"),
    );
  const handleNext = () =>
    setValue(mode === "month" ? value.add(1, "month") : value.add(1, "week"));
  const handleToday = () => setValue(dayjs());

  const dateCellRender = (val: Dayjs) => {
    const list = events.filter((e) => dayjs(e.date).isSame(val, "day"));
    return (
      <ul className="events">
        {list.map((item) => (
          <li key={item.id}>
            <Badge
              color="#7c41f7"
              text={
                <span
                  style={{
                    fontWeight: 700,
                    color: "#7c41f7",
                    cursor: "pointer",
                  }}
                  onClick={() => item?.id && setShowId(String(item.id))}
                >
                  {item.title}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    );
  };

  const monthCellRender = (val: Dayjs) => {
    const list = events.filter((e) => dayjs(e.date).isSame(val, "day"));
    return list.length ? (
      <div className="notes-month">
        <section>{list.length}</section>
        <span>Events</span>
      </div>
    ) : null;
  };

  const snapshotCsv = () => {
    const label = value.format("MM-YYYY");
    const rows = events
      .filter((e) => dayjs(e.date).isSame(value, "month"))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
      .map((e) =>
        [
          sanitizeCsv(e.id),
          sanitizeCsv(e.title),
          sanitizeCsv(dayjs(e.date).format("DD-MM-YYYY")),
          sanitizeCsv(e.performedBy || ""),
          sanitizeCsv(e.performedAtUtc || ""),
          sanitizeCsv(e.description || ""),
        ].join(","),
      );

    const header = [
      "id",
      "title",
      "date",
      "performed_by",
      "performed_at_utc",
      "description",
    ].join(",");
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendar_month_snapshot_${label}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const extraControls = (
    <Space>
      <Button icon={<LeftOutlined />} onClick={handlePrev} />
      <Button onClick={handleToday} icon={<CalendarOutlined />}>
        Today
      </Button>
      <Button icon={<RightOutlined />} onClick={handleNext} />
      <select
        className="calendar-select"
        value={value.year()}
        onChange={(e) => setValue(value.clone().year(Number(e.target.value)))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        className="calendar-select"
        value={value.month()}
        onChange={(e) => setValue(value.clone().month(Number(e.target.value)))}
      >
        {months.map((m, i) => (
          <option key={m} value={i}>
            {m}
          </option>
        ))}
      </select>
      <Button type="primary" icon={<DownloadOutlined />} onClick={snapshotCsv}>
        Take a Snapshot
      </Button>
    </Space>
  );

  const renderWeek = () => {
    const weekStart = value.startOf("week");
    const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
    const counts = days.map(
      (d) =>
        (data?.data ?? []).filter((e) => dayjs(e.date).isSame(d, "day")).length,
    );
    const maxRows = Math.max(7, ...counts);

    return (
      <div className="gc-week-wrapper">
        <div
          className="gc-week-grid"
          style={{ ["--week-rows" as any]: String(maxRows) }}
        >
          {days.map((day, idx) => {
            const dayEvents = (data?.data ?? []).filter((e) =>
              dayjs(e.date).isSame(day, "day"),
            );
            return (
              <div
                className={`gc-week-day-col ${idx > 0 ? "gc-week-day-col-sep" : ""}`}
                key={day.format("DD-MM-YYYY")}
              >
                <div className="gc-week-day-label">
                  {day.format("ddd, MMM D")}
                </div>

                <div className="gc-week-events-col">
                  <div className="gc-week-slots">
                    {Array.from({ length: maxRows }).map((_, i) => (
                      <div className="gc-week-slot" key={i} />
                    ))}
                  </div>

                  {dayEvents.map((e) => (
                    <div
                      className="gc-week-event"
                      key={e.id}
                      title={e.description || ""}
                      onClick={() => setShowId(String(e.id))}
                    >
                      <div className="gc-week-event-title">{e.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-root">
      <h2 className="calendar-title">Calendar</h2>
      <Tabs
        className="tabs-default tabs-calendar"
        activeKey={mode}
        onChange={(k) => setMode(k as ViewMode)}
        items={[
          { key: "month", label: "Month" },
          { key: "week", label: "Week" },
        ]}
        tabBarExtraContent={extraControls}
      />
      {mode === "week" ? (
        renderWeek()
      ) : (
        <Calendar
          value={value}
          onPanelChange={(v) => setValue(v)}
          onSelect={(v) => setValue(v)}
          dateCellRender={dateCellRender}
          monthCellRender={monthCellRender}
          headerRender={() => null}
        />
      )}
      {showId && (
        <CalendarShow
          visible={!!showId}
          onClose={() => setShowId(null)}
          eventId={showId}
        />
      )}
    </div>
  );
}
