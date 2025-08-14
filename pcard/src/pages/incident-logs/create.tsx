import { Create, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, Select } from "antd";

export const IncidentLogCreate = () => {
  const { formProps, saveButtonProps } = useForm({});

  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label={"Title"}
          name={["title"]}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={"Content"}
          name="content"
          rules={[{ required: true }]}
        >
          {/* SECURITY: @UIW EDITOR ESCAPES HTML BY DEFAULT; AVOID RAW HTML */}
          <MDEditor data-color-mode="light" />
        </Form.Item>

        <Form.Item
          label={"Category"}
          name={["category", "id"]}
          rules={[{ required: true }]}
        >
          <Select {...categorySelectProps} />
        </Form.Item>

        <Form.Item
          label={"Status"}
          name={["status"]}
          initialValue={"draft"}
          rules={[{ required: true }]}
        >
          <Select
            defaultValue={"draft"}
            options={[
              { value: "draft", label: "Draft" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ]}
          />
        </Form.Item>
      </Form>
    </Create>
  );
};

/* ALL COMMENTS ARE IN ENGLISH AND CAPS */
