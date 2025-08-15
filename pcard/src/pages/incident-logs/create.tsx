import { Create, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, Select, Row, Col } from "antd";
import { useContext, useEffect } from "react";
import { ColorModeContext } from "../../contexts/color-mode";

export const IncidentLogCreate = () => {
  const { formProps, saveButtonProps } = useForm({});
  const { mode } = useContext(ColorModeContext); /* SYNC DARK/LIGHT */

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
  }, [presetCompanyId, companySelectProps?.options]);

  return (
    <Create headerButtons={() => null} saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        className="form-compact"
        initialValues={{
          status: "draft",
          company: presetCompanyId ? { id: presetCompanyId } : undefined,
        }}
        /* SAFELY ADD TIMESTAMPS AND SERIALIZE BEFORE SUBMIT */
        onFinish={async (values) => {
          const now = new Date().toISOString();
          const v: any = { ...values };
          if (!v.createdAt && !v.CreatedAt)
            v.createdAt = now; /* BACKEND FALLBACK */
          v.updatedAt = now;
          if (v.dueAt?.toISOString) v.dueAt = v.dueAt.toISOString();
          return formProps.onFinish?.(v);
        }}
      >
        {/* ROW 1: COMPANY + TITLE */}
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={"Company"}
              name={["company", "id"]}
              rules={[{ required: true }]}
            >
              <Select {...companySelectProps} size="middle" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={"Title"}
              name={["title"]}
              rules={[{ required: true }]}
            >
              <Input size="middle" />
            </Form.Item>
          </Col>
        </Row>

        {/* ROW 2: DETAIL FULL-WIDTH (ALLOW IMAGES) */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item
              label={"Detail"}
              name="detail"
              rules={[{ required: true }]}
            >
              {/* SECURITY: NO DANGEROUS HTML, EDITOR SANITIZES */}
              <MDEditor data-color-mode={mode as "light" | "dark"} />
            </Form.Item>
          </Col>
        </Row>

        {/* ROW 3: SOLUTION FULL-WIDTH */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item label={"Solution"} name="solution">
              <MDEditor data-color-mode={mode as "light" | "dark"} />
            </Form.Item>
          </Col>
        </Row>

        {/* ROW 4: INCIDENT TYPE + STATUS */}
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={"Incident type"}
              name={["category", "id"]}
              rules={[{ required: true }]}
            >
              <Select {...categorySelectProps} size="middle" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={"Status"}
              name={["status"]}
              rules={[{ required: true }]}
            >
              <Select
                size="middle"
                options={[
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Closed" },
                  { value: "draft", label: "Draft" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Create>
  );
};
