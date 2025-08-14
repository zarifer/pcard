import { Create, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, Select } from "antd";
import { useContext, useEffect } from "react";
import { ColorModeContext } from "../../contexts/color-mode";

/* ALL COMMENTS IN ENGLISH AND CAPS */

export const IncidentLogCreate = () => {
  const { formProps, saveButtonProps } = useForm({});
  const { mode } = useContext(ColorModeContext); /* SYNC DARK/LIGHT */

  /* COMPANY SELECT: LABEL = PRODUCT NAME */
  const { selectProps: companySelectProps } = useSelect({
    resource: "companies",
    optionLabel: "product",
    optionValue: "id",
    sorters: [{ field: "product", order: "asc" }],
  });

  /* INCIDENT TYPE (CATEGORIES) */
  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "title",
    optionValue: "id",
  });

  /* PREFILL FROM ?companyId= IF PRESENT; OTHERWISE PICK FIRST OPTION */
  const params = new URLSearchParams(window.location.search);
  const presetCompanyId = params.get("companyId") || undefined;

  useEffect(() => {
    // @ts-ignore
    const form = formProps?.form;
    const current = form?.getFieldValue?.(["company", "id"]);
    const first = companySelectProps?.options?.[0]?.value;
    if (!presetCompanyId && !current && first) {
      form?.setFieldsValue?.({ company: { id: first } });
    }
  }, [
    presetCompanyId,
    companySelectProps?.options,
  ]); /* KEEP HOOK ORDER STABLE */

  return (
    <Create headerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          status: "draft",
          company: presetCompanyId ? { id: presetCompanyId } : undefined,
        }}
        /* SAFELY ADD TIMESTAMPS AND SERIALIZE BEFORE SUBMIT */
        onFinish={async (values) => {
          const now = new Date().toISOString();
          const v: any = { ...values };
          if (!v.createdAt && !v.CreatedAt)
            v.createdAt = now; /* FALLBACK IF BACKEND MISSES IT */
          v.updatedAt = now;
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
    </Create>
  );
};
