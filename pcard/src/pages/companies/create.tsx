import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Button, Space } from "antd";
import MDEditor from "@uiw/react-md-editor";

export default function CompanyCreate() {
  const { formProps, saveButtonProps } = useForm({ resource: "companies" });

  return (
    <Create
      /* REMOVE LIST/REFRESH FROM HEADER */
      headerButtons={() => null}
      saveButtonProps={saveButtonProps}
    >
      <Form {...formProps} layout="vertical">
        {/* COMPANY NAME IS REQUIRED */}
        <Form.Item
          label="Company Name"
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        {/* VENDOR NAME */}
        <Form.Item label="Vendor Name" name="vendor">
          <Input />
        </Form.Item>

        {/* PRODUCT NAME */}
        <Form.Item label="Product Name" name="product">
          <Input />
        </Form.Item>

        {/* CONTACT EMAILS (MAX 2) */}
        <Form.List name="emails">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline">
                  <Form.Item
                    {...field}
                    label={field.name === 0 ? "Contact Emails" : ""}
                    name={[field.name]}
                    rules={[{ type: "email", message: "Invalid email" }]}
                  >
                    <Input placeholder="name@example.com" />
                  </Form.Item>
                  <Button onClick={() => remove(field.name)} danger>
                    Remove
                  </Button>
                </Space>
              ))}
              {fields.length < 2 && (
                <Form.Item>
                  <Button onClick={() => add()}>Add email</Button>
                </Form.Item>
              )}
            </>
          )}
        </Form.List>

        <Form.Item label="GUI" name="gui">
          <Input />
        </Form.Item>

        <Form.Item label="Log path" name="log">
          <Input />
        </Form.Item>

        {/* RAW MARKDOWN – BACKEND SHOULD STORE SAFE TEXT */}
        <Form.Item label="Spec features description" name="features">
          <MDEditor />
        </Form.Item>
      </Form>
    </Create>
  );
}
