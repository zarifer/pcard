import { Edit, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, Select } from "antd";
import { useContext } from "react";
import { ColorModeContext } from "../../contexts/color-mode";

/* ALL COMMENTS IN ENGLISH AND CAPS */

export const IncidentLogEdit = () => {
  const { formProps, saveButtonProps, queryResult, formLoading } = useForm({});
  const record = queryResult?.data?.data;
  const { mode } = useContext(ColorModeContext);

  const { selectProps: companySelectProps } = useSelect({
    resource: "companies",
    optionLabel: "product",
    optionValue: "id",
    sorters: [{ field: "product", order: "asc" }],
    defaultValue: record?.company?.id,
    queryOptions: { enabled: true },
  });

  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "title",
    optionValue: "id",
    defaultValue: record?.category?.id,
    queryOptions: { enabled: true },
  });

  return (
    <Edit
      headerButtons={() => null}
      saveButtonProps={saveButtonProps}
      isLoading={formLoading}
    >
      <Form
        {...formProps}
        layout="vertical"
        onFinish={async (values) => {
          const v: any = { ...values, updatedAt: new Date().toISOString() };
          if (v.dueAt?.toISOString) v.dueAt = v.dueAt.toISOString();
          return formProps.onFinish?.(v);
        }}
      >
        <Form.Item
          label={"Company"}
          name={["company", "id"]}
          rules={[{ required: true }]}
        >
          <Select {...companySelectProps} />
        </Form.Item>

        <Form.Item
          label={"Title"}
          name={["title"]}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label={"Detail"} name="detail" rules={[{ required: true }]}>
          <MDEditor data-color-mode={mode as "light" | "dark"} />
        </Form.Item>

        <Form.Item label={"Solution"} name="solution">
          <MDEditor data-color-mode={mode as "light" | "dark"} />
        </Form.Item>

        <Form.Item
          label={"Incident type"}
          name={["category", "id"]}
          rules={[{ required: true }]}
        >
          <Select {...categorySelectProps} />
        </Form.Item>

        <Form.Item
          label={"Status"}
          name={["status"]}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
              { value: "draft", label: "Draft" },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
