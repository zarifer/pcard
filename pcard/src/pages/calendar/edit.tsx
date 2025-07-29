import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, DatePicker, Select, Button, Checkbox } from "antd";
import "./index.css";
import type { IEvent } from "../../interfaces/ievent";
import { Dayjs } from "dayjs";
import { useState } from "react";

type CalendarFormValues = Omit<IEvent, "date" | "endDate"> & {
  date?: [Dayjs?, Dayjs?] | Dayjs;
};

const participantsOptions = [
  { value: "alice@example.com", label: "Alice" },
  { value: "bob@example.com", label: "Bob" },
  { value: "eve@example.com", label: "Eve" },
];

export const CalendarEdit = () => {
  const [isRange, setIsRange] = useState(false);

  // Itt hozzáadtuk a queryResult-ot, hogy lehessen hibát/állapotot kezelni
  const { formProps, saveButtonProps, queryResult } = useForm<CalendarFormValues>();

  // Ha hiba jött vissza (pl. nincs ilyen ID)
  if (queryResult?.isError) {
    return <div style={{ padding: 24, color: "red" }}>Event not found.</div>;
  }

  // Ha még tölt
  if (queryResult?.isLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit Event">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Title" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>

        <Form.Item label="Multi-day event" name="multi" valuePropName="checked">
          <Checkbox onChange={(e) => setIsRange(e.target.checked)}>
            Multiple days
          </Checkbox>
        </Form.Item>

        <Form.Item
          label="Date(s)"
          name="date"
          rules={[{ required: true, message: "Please select date(s)!" }]}
        >
          {isRange ? (
            <DatePicker.RangePicker
              format="YYYY/MM/DD"
              style={{ minWidth: 220 }}
            />
          ) : (
            <DatePicker format="YYYY/MM/DD" style={{ minWidth: 220 }} />
          )}
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
            />
          </Form.Item>
        </div>

        <Form.Item label="Invite participants" name="participants">
          <Select
            mode="multiple"
            allowClear
            placeholder="Select participants"
            options={participantsOptions}
          />
        </Form.Item>

        <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
          <Button
            onClick={() => window.history.back()}
            style={{ marginRight: 12 }}
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </Edit>
  );
};

export default CalendarEdit;
