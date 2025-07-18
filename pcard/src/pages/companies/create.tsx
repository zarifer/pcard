import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";
import MDEditor from "@uiw/react-md-editor";


export default function CompanyCreatePage() {
    const { formProps, saveButtonProps } = useForm({ resource: "companies" });

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="Company Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item label="Industry" name="industry"><Input /></Form.Item>
                <Form.Item label="Email" name="email"><Input /></Form.Item>
                <Form.Item label="Phone" name="phone"><Input /></Form.Item>
                <Form.Item label="Location" name="location"><Input /></Form.Item>
                <Form.Item label="Company description" name="content"><MDEditor /></Form.Item>
            </Form>
        </Create>
    );
}
