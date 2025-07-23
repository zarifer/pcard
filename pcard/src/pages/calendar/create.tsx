import { Create, useForm } from "@refinedev/antd";
import { Form, Input, DatePicker, Select, Checkbox, Button } from "antd";
import { useState } from "react";
import "./index.css";

const participantsOptions = [
    { value: "alice@example.com", label: "Alice" },
    { value: "bob@example.com", label: "Bob" },
    { value: "eve@example.com", label: "Eve" },
];

export const CalendarCreate = () => {
    const { formProps, saveButtonProps } = useForm();
    const [allDay, setAllDay] = useState(false);

    return (
        <Create saveButtonProps={saveButtonProps} title="Create Event">
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true }]}
                >
                    <Input placeholder="Event title" />
                </Form.Item>

                <Form.Item
                    label="Description"
                    name="description"
                    rules={[{ required: false }]}
                >
                    <Input.TextArea placeholder="Event description" autoSize={{ minRows: 2, maxRows: 6 }} />
                </Form.Item>

                <Form.Item label="Date & Time" required>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <Checkbox
                            checked={allDay}
                            onChange={e => setAllDay(e.target.checked)}
                            style={{ marginRight: 16 }}
                        >
                            All Day
                        </Checkbox>
                        <Form.Item
                            name="date"
                            noStyle
                            rules={[{ required: true, message: "Please select date!" }]}
                        >
                            <DatePicker
                                format="YYYY/MM/DD"
                                style={{ minWidth: 140 }}
                                placeholder="Date"
                            />
                        </Form.Item>
                        {!allDay && (
                            <>
                                <Form.Item
                                    name="startTime"
                                    noStyle
                                    rules={[{ required: true, message: "Start time required" }]}
                                >
                                    <DatePicker.TimePicker
                                        placeholder="Start time"
                                        format="HH:mm"
                                        style={{ width: 110 }}
                                    />
                                </Form.Item>
                                <span style={{ margin: "0 6px" }}>–</span>
                                <Form.Item
                                    name="endTime"
                                    noStyle
                                    rules={[{ required: true, message: "End time required" }]}
                                >
                                    <DatePicker.TimePicker
                                        placeholder="End time"
                                        format="HH:mm"
                                        style={{ width: 110 }}
                                    />
                                </Form.Item>
                            </>
                        )}
                    </div>
                </Form.Item>

                <div style={{ display: "flex", gap: 16 }}>
                    <Form.Item
                        label="Category"
                        name="type"
                        rules={[{ required: true }]}
                        initialValue="Pre-test"
                    >
                        <Select
                            options={[
                                { value: "Pre-test", label: "Pre-test" },
                                { value: "Main test", label: "Main test" },
                                { value: "Post-test", label: "Post-test" },
                                { value: "Debug", label: "Debug" },
                            ]}
                            placeholder="Category"
                        />
                    </Form.Item>
                </div>

                <Form.Item
                    label="Invite participants"
                    name="participants"
                    rules={[{ required: false }]}
                >
                    <Select
                        mode="multiple"
                        allowClear
                        placeholder="Select participants"
                        options={participantsOptions}
                    />
                </Form.Item>

                <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
                    <Button onClick={() => window.history.back()} style={{ marginRight: 12 }}>
                        Cancel
                    </Button>
                </Form.Item>
            </Form>
        </Create>
    );
};

export default CalendarCreate;
