import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";
import MDEditor from "@uiw/react-md-editor";


export default function CompanyCreate() {
    const { formProps, saveButtonProps } = useForm({ resource: "companies" });

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="Company Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item label="Product Name" name="product"><Input /></Form.Item>
                <Form.Item label="Contact Email" name="email"><Input /></Form.Item>
                <Form.Item label="GUI" name="gui"><Input /></Form.Item>
                <Form.Item label="Log path" name="log"><Input /></Form.Item>
                <Form.Item label="Spec features description" name="features"><MDEditor /></Form.Item>
            </Form>
        </Create>
    );
}
