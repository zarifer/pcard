import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";
import MDEditor from "@uiw/react-md-editor";


export default function CompanyEditPage() {
    const { formProps, saveButtonProps } = useForm({ resource: "companies" });

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="Company Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item label="Industry" name="industry"><Input /></Form.Item>
                <Form.Item label="Email" name="email"><Input /></Form.Item>
                <Form.Item label="Phone" name="phone"><Input /></Form.Item>
                <Form.Item label="Location" name="location"><Input /></Form.Item>
                <Form.Item label="Company description" name="content"><MDEditor /></Form.Item>
            </Form>
        </Edit>
    );
}
