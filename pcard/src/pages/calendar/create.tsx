import { Create, useForm } from "@refinedev/antd";
import { Form, Input, DatePicker, Select } from "antd";

export const CalendarCreate = () => {
    const { formProps, saveButtonProps } = useForm({
    });

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Date"
                    name="date"
                    rules={[{ required: true }]}
                >
                    <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item
                    label="Type"
                    name="type"
                    rules={[{ required: true }]}
                    initialValue="success"
                >
                    <Select
                        options={[
                            { value: "success", label: "Success" },
                            { value: "warning", label: "Warning" },
                            { value: "error", label: "Error" },
                            { value: "default", label: "Default" },
                        ]}
                    />
                </Form.Item>
            </Form>
        </Create>
    );
};
export default CalendarCreate;