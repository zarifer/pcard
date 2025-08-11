import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, DatePicker, Select, Button, Checkbox } from "antd";
import "./index.css";
import type { IEvent } from "../../interfaces/ievent";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type CalendarFormValues = Omit<IEvent, "date" | "endDate"> & {
  date?: [Dayjs, Dayjs] | Dayjs;
};

const participantsOptions = [
  { value: "alice@example.com", label: "Alice" },
  { value: "bob@example.com", label: "Bob" },
  { value: "eve@example.com", label: "Eve" },
];

function toDayjsValue(
  val: any,
  isRange: boolean,
): [Dayjs, Dayjs] | Dayjs | undefined {
  if (!val) return undefined;
  if (isRange) {
    if (Array.isArray(val)) return [dayjs(val[0]), dayjs(val[1])];
    return [dayjs(val), dayjs(val)];
  }
  if (Array.isArray(val)) return dayjs(val[0]);
  return dayjs(val);
}

export const CalendarEdit = () => {
  const { id } = useParams();
  const [isRange, setIsRange] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);

  const { formProps, saveButtonProps, queryResult, form } =
    useForm<CalendarFormValues>();

  useEffect(() => {
    setReady(false);
    form.resetFields();
    setIsRange(false);
  }, [id]);

  useEffect(() => {
    const data = queryResult?.data?.data;
    if (!data) return;
    const multi = !!data.multi;
    setIsRange(multi);
    const date = toDayjsValue(data.date, multi);
    form.setFieldsValue({ ...data, date });
    setReady(true); // Ekkor már minden state friss!
  }, [queryResult?.data?.data, form]);

  if (queryResult?.isLoading || !ready) return <div>Loading...</div>;
  if (queryResult?.isError)
    return <div style={{ color: "red" }}>Event not found.</div>;
  if (!queryResult?.data?.data) return <div>No event data found.</div>;

  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit Event">
      <Form
        key={id + "_" + isRange}
        {...formProps}
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item label="Title" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item label="Multi-day event" name="multi" valuePropName="checked">
          <Checkbox
            checked={isRange}
            onChange={(e) => {
              setIsRange(e.target.checked);
              form.setFieldsValue({ date: undefined });
            }}
          >
            Multiple days
          </Checkbox>
        </Form.Item>
        <Form.Item
          key={isRange ? "date-range" : "date-single"}
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
              { value: "Kanban", label: "Kanban" },
            ]}
          />
        </Form.Item>
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
