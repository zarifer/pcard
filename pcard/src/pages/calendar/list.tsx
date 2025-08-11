import { useList } from "@refinedev/core";
import { Badge, Calendar, Button, Segmented, Space } from "antd";
import {
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useNavigation } from "@refinedev/core";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import type { CalendarMode } from "antd/lib/calendar/generateCalendar";
import { useState } from "react";

import { CategoriesBox } from "./categoriesbox";
import { CATEGORY_COLORS } from "./show";
import { CalendarShow } from "./show";
import "./index.css";
import type { IEvent } from "../../interfaces/ievent";

dayjs.extend(isBetween);

const getStartDate = (e: any) =>
  Array.isArray(e.date) ? dayjs(e.date[0]) : dayjs(e.date);

const getEndDate = (e: any) =>
  e.endDate
    ? dayjs(e.endDate)
    : Array.isArray(e.date)
      ? dayjs(e.date[1])
      : dayjs(e.date);

export const CalendarList = () => {
  const { data } = useList<IEvent>({
    resource: "calendar",
    config: { pagination: { pageSize: 100 } },
  });
  const { create } = useNavigation();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([
    "Pre-test",
    "Main test",
    "Post-test",
    "Debug",
    "KanBan",
  ]);

  const [mode, setMode] = useState<CalendarMode | "week">("month");
  const [value, setValue] = useState<Dayjs>(dayjs());

  const filteredData =
    data?.data?.filter(
      (calendar) =>
        selectedCategories.length === 0 ||
        selectedCategories.includes(calendar.type),
    ) ?? [];

  // Month nézet: napi cella
  const dateCellRender = (value: dayjs.Dayjs) => {
    const listData = filteredData.filter((e) => {
      const start = getStartDate(e);
      const end = getEndDate(e);
      return value.isBetween(start, end, "day", "[]");
    });

    return (
      <ul className="events">
        {listData.map((item) => (
          <li key={item.id}>
            <Badge
              color={CATEGORY_COLORS[item.type] || "#808080"}
              text={
                <span
                  style={{
                    fontWeight: 700,
                    color: CATEGORY_COLORS[item.type] || "#808080",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (item?.id) {
                      setShowId(item.id.toString());
                    }
                  }}
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

  // Month nézet: havi összesítő
  const monthCellRender = (value: dayjs.Dayjs) => {
    const listData = filteredData.filter((e) => {
      const start = getStartDate(e);
      const end = getEndDate(e);
      return value.isBetween(start, end, "day", "[]");
    });

    return listData.length > 0 ? (
      <div className="notes-month">
        <section>{listData.length}</section>
        <span>Events</span>
      </div>
    ) : null;
  };

  const [showId, setShowId] = useState<string | null>(null);

  const years = [];
  const thisYear = dayjs().year();
  for (let i = thisYear - 5; i <= thisYear + 5; i++) {
    years.push(i);
  }
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

  const handlePrev = () => {
    if (mode === "month") setValue(value.subtract(1, "month"));
    else if (mode === "week") setValue(value.subtract(1, "week"));
  };
  const handleNext = () => {
    if (mode === "month") setValue(value.add(1, "month"));
    else if (mode === "week") setValue(value.add(1, "week"));
  };
  const handleToday = () => setValue(dayjs());

  const viewOptions = [
    { value: "month", label: "Month" },
    { value: "week", label: "Week" },
  ];

  // Week nézet
  const getCustomPanel = () => {
    // Google Calendar-szerű grid
    if (mode === "week") {
      const weekStart = value.startOf("week");
      const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));

      // Minden nap külön oszlop, fejléccel
      return (
        <div className="gc-week-wrapper">
          <div className="gc-week-grid">
            {days.map((day) => (
              <div className="gc-week-day-col" key={day.format("YYYY-MM-DD")}>
                <div className="gc-week-day-label">
                  {day.format("ddd, MMM D")}
                </div>
                <div className="gc-week-events-col">
                  {filteredData
                    .filter((e) => {
                      const start = getStartDate(e);
                      const end = getEndDate(e);
                      return day.isBetween(start, end, "day", "[]");
                    })
                    .map((e) => (
                      <div
                        className="gc-week-event"
                        key={e.id}
                        style={{
                          borderLeft: `4px solid ${CATEGORY_COLORS[e.type] || "#7c41f7"}`,
                        }}
                        title={e.description || ""}
                        onClick={() => setShowId(e.id)}
                      >
                        <div className="gc-week-event-title">{e.title}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default: hónapnézet
    return (
      <Calendar
        value={value}
        onPanelChange={(v, m) => {
          setValue(v);
          setMode(m);
        }}
        onSelect={(v) => setValue(v)}
        dateCellRender={dateCellRender}
        monthCellRender={monthCellRender}
        fullscreen={true}
        headerRender={() => null}
      />
    );
  };

  return (
    <div className="calendar-page-container">
      <aside className="calendar-sidebar">
        <button
          className="calendar-create-btn"
          onClick={() => create("calendar")}
        >
          <PlusOutlined style={{ fontSize: 12, marginRight: 2 }} />
          Create event
        </button>
        <CategoriesBox
          categories={allCategories}
          selected={selectedCategories}
          onSelect={setSelectedCategories}
          onCategoriesChange={setAllCategories}
        />
      </aside>

      <main style={{ flex: 1 }}>
        <div className="calendar-header-row">
          <h2 className="calendar-title">Calendar</h2>
          <Space>
            <Button icon={<LeftOutlined />} onClick={handlePrev} />
            <Button onClick={handleToday} icon={<CalendarOutlined />}>
              Today
            </Button>
            <Button icon={<RightOutlined />} onClick={handleNext} />
            <select
              className="calendar-select"
              value={value.year()}
              onChange={(e) =>
                setValue(value.clone().year(Number(e.target.value)))
              }
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
              onChange={(e) =>
                setValue(value.clone().month(Number(e.target.value)))
              }
            >
              {months.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <Segmented
              options={viewOptions}
              value={mode}
              onChange={(value) => setMode(value as CalendarMode | "week")}
              style={{ marginLeft: 12, minWidth: 120 }}
            />
          </Space>
        </div>
        {getCustomPanel()}
      </main>

      {showId && (
        <CalendarShow
          visible={!!showId}
          onClose={() => setShowId(null)}
          eventId={showId}
        />
      )}
    </div>
  );
};

export default CalendarList;
