import { useList } from "@refinedev/core";
import { Badge, Calendar, Button, Segmented, Space } from "antd";
import { PlusOutlined, LeftOutlined, RightOutlined, CalendarOutlined } from "@ant-design/icons";
import { useNavigation } from "@refinedev/core";
import dayjs, { Dayjs } from "dayjs";
import type { CalendarMode } from "antd/lib/calendar/generateCalendar";
import { useState } from "react";

//Own stuff
import { CategoriesBox } from './categoriesbox';
import { CATEGORY_COLORS } from "./show";
import { CalendarShow } from "./show";
import "./index.css";
import type { IEvent } from "../../interfaces/ievent";


export const CalendarList = () => {
    const { data } = useList<IEvent>({
        resource: "calendar",
        config: { pagination: { pageSize: 100 } },
    });
    const { create } = useNavigation();

    // Category filtering
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([
        "Pre-test", "Main test", "Post-test", "Debug"
    ]);

    // View + date control
    const [mode, setMode] = useState<CalendarMode | "week" | "day">("month");
    const [value, setValue] = useState<Dayjs>(dayjs());

    // Filtered events
    const filteredData = data?.data?.filter(calendar =>
        selectedCategories.length === 0 ||
        selectedCategories.includes(calendar.type)
    ) ?? [];

    // Custom Calendar renders
    const monthCellRender = (value: dayjs.Dayjs) => {
        const listData = filteredData.filter((p) =>
            dayjs(p.date).isSame(value, "month")
        );
        return listData.length > 0 ? (
            <div className="notes-month">
                <section>{listData.length}</section>
                <span>Events</span>
            </div>
        ) : null;
    };

    const [showId, setShowId] = useState<string | null>(null);

    const dateCellRender = (value: dayjs.Dayjs) => {
        const listData = filteredData.filter((p) =>
            dayjs(p.date).isSame(value, "day")
        );
        return (
            <ul className="events">
                {listData?.map((item) => (
                    <li key={item.id}>
                       <Badge
                            color={CATEGORY_COLORS[item.type] || "#808080"}
                            text={
                                <span
                                    style={{
                                        fontWeight: 700,
                                        color: CATEGORY_COLORS[item.type] || "#808080",
                                         cursor: "pointer"
                                    }}
                                    onClick={() => setShowId(item.id)}
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

    // Gomb handler - hónap/év/week/day léptetés
    const handlePrev = () => {
        if (mode === "month") setValue(value.subtract(1, "month"));
        else if (mode === "year") setValue(value.subtract(1, "year"));
        else if (mode === "week") setValue(value.subtract(1, "week"));
        else if (mode === "day") setValue(value.subtract(1, "day"));
    };
    const handleNext = () => {
        if (mode === "month") setValue(value.add(1, "month"));
        else if (mode === "year") setValue(value.add(1, "year"));
        else if (mode === "week") setValue(value.add(1, "week"));
        else if (mode === "day") setValue(value.add(1, "day"));
    };
    const handleToday = () => setValue(dayjs());

    // View váltás (month, year, week, day)
    const viewOptions = [
        { value: "month", label: "Month" },
        { value: "week", label: "Week" },
        { value: "day", label: "Day" },
        { value: "year", label: "Year" },
    ];

    // Ha week/day view: csak az aktuális hét/nap eventjeit rendereljük
    const getCustomPanel = () => {
        if (mode === "week") {
            // Week nézet: az adott hét napjai + eventek
            const weekStart = value.startOf("week");
            const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
            return (
                <div className="week-view">
                    <div style={{ display: "flex", gap: 8 }}>
                        {days.map(day => (
                            <div key={day.format("YYYY-MM-DD")} style={{ flex: 1, minWidth: 120 }}>
                                <div style={{ fontWeight: 600, textAlign: "center" }}>
                                    {day.format("ddd, MMM D")}
                                </div>
                                <ul className="events">
                                    {filteredData.filter(e => dayjs(e.date).isSame(day, "day"))
                                        .map(e => (
                                            <li key={e.id}>
                                                <Badge status={e.type as any} text={e.title} />
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        if (mode === "day") {
            // Day nézet: csak az aktuális nap eventjei
            return (
                <div className="day-view">
                    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
                        {value.format("dddd, MMMM D.")}
                    </div>
                    <ul className="events">
                        {filteredData.filter(e => dayjs(e.date).isSame(value, "day"))
                            .map(e => (
                                <li key={e.id}>
                                    <Badge status={e.type as any} text={e.title} />
                                </li>
                            ))}
                    </ul>
                </div>
            );
        }
        // default: month/year nézet – az AntD Calendar
        return (
            <Calendar
    value={value}
    mode={mode === "month" || mode === "year" ? mode : "month"}
    onPanelChange={(v, m) => { setValue(v); setMode(m); }}
    onSelect={(v) => setValue(v)}
    dateCellRender={dateCellRender}
    monthCellRender={monthCellRender}
    fullscreen={true}
    headerRender={({ value: headerValue, onChange, onTypeChange }) => {
        // Évek/hónapok generálása
        const years = [];
        const thisYear = dayjs().year();
        for (let i = thisYear - 5; i <= thisYear + 5; i++) {
            years.push(i);
        }
        const months = dayjs.monthsShort();

        return (
            <div className="calendar-header-row" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Year select */}
                <select
                    value={headerValue.year()}
                    onChange={e => {
                        const newYear = Number(e.target.value);
                        onChange(headerValue.clone().year(newYear));
                    }}
                    className="calendar-header-select"
                >
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                {/* Month select (csak month módban) */}
                {mode === "month" && (
                    <select
                        value={headerValue.month()}
                        onChange={e => {
                            const newMonth = Number(e.target.value);
                            onChange(headerValue.clone().month(newMonth));
                        }}
                        className="calendar-header-select"
                    >
                        {months.map((name, i) => (
                            <option key={name} value={i}>{name}</option>
                        ))}
                    </select>
                )}
                {/* Month/Year nézetváltó */}
                <select
                    value={mode}
                    onChange={e => {
                        const newMode = e.target.value as "month" | "year";
                        setMode(newMode);
                        onTypeChange?.(newMode);
                    }}
                    className="calendar-header-select"
                >
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                </select>
                {/* TODAY gomb */}
                <button
                    className="calendar-today-btn"
                    onClick={() => {
                        onChange(dayjs());
                    }}
                    style={{
                        marginLeft: 1,
                        fontWeight: 700,
                        background: "var(--btn-gradient, #7c41f7)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 7,
                        padding: "4px 18px",
                        cursor: "pointer",
                        boxShadow: "0 1px 6px #bc80fc33",
                    }}
                >
                    Today
                </button>
            </div>
        );
    }}
/>

        );
    };

    return (
        <div className="calendar-page-container">
            {/* Sidebar */}
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
            {/* Main */}
            <main style={{ flex: 1 }}>
                <div className="calendar-header-row">
                    <h2 className="calendar-title">Calendar</h2>
                    <Space>
                        <Button icon={<LeftOutlined />} onClick={handlePrev} />
                        <Button onClick={handleToday} icon={<CalendarOutlined />}>Today</Button>
                        <Button icon={<RightOutlined />} onClick={handleNext} />
                        <Segmented
                            options={viewOptions}
                            value={mode}
                            onChange={value => setMode(value as CalendarMode | "week" | "day")}
                            style={{ marginLeft: 12, minWidth: 180 }}
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
