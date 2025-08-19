import { Create, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, Select, Row, Col } from "antd";
import { useContext, useEffect } from "react";
import { ColorModeContext } from "../../contexts/color-mode";

export const IncidentLogCreate = () => {
  const { formProps, saveButtonProps } = useForm({});
  const { mode } = useContext(ColorModeContext);

  const { selectProps: companySelectProps } = useSelect({
    resource: "companies",
    optionLabel: "product",
    optionValue: "id",
    sorters: [{ field: "product", order: "asc" }],
  });

  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "title",
    optionValue: "id",
  });

  const params = new URLSearchParams(window.location.search);
  const presetCompanyId = params.get("companyId") || undefined;

  useEffect(() => {
    /* SET DEFAULT COMPANY IF NONE SELECTED */
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
        onFinish={async (values) => {
          /* NORMALIZE PAYLOAD FOR BACKEND COMPATIBILITY */
          const now = new Date().toISOString();
          const v: any = { ...values };

          const companyId =
            v?.company?.id ?? v?.["company.id"] ?? v?.companyId ?? undefined;
          if (companyId) {
            v.company = { id: String(companyId) };
            v.companyId = String(companyId);
          }

          const categoryId =
            v?.category?.id ?? v?.["category.id"] ?? v?.categoryId ?? undefined;
          if (categoryId) {
            v.category = { id: String(categoryId) };
            v.categoryId = String(categoryId);
          }

          if (!v.createdAt && !v.CreatedAt) v.createdAt = now;
          v.updatedAt = now;
          if (v.dueAt?.toISOString) v.dueAt = v.dueAt.toISOString();

          return formProps.onFinish?.(v);
        }}
      >
        {/* ROW 1: COMPANY + TITLE */}
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Company"
              name={["company", "id"]}
              rules={[{ required: true }]}
            >
              <Select {...companySelectProps} size="middle" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Title"
              name={["title"]}
              rules={[{ required: true }]}
            >
              <Input size="middle" />
            </Form.Item>
          </Col>
        </Row>

        {/* ROW 2: INCIDENT TYPE + STATUS (MOVED UP) */}
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Incident type"
              name={["category", "id"]}
              rules={[{ required: true }]}
            >
              <Select {...categorySelectProps} size="middle" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Status"
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

        {/* ROW 3: DETAIL FULL-WIDTH */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item
              label="Detail"
              name="detail"
              rules={[{ required: true }]}
            >
              <MDEditor data-color-mode={mode as "light" | "dark"} />
            </Form.Item>
          </Col>
        </Row>

        {/* ROW 4: SOLUTION FULL-WIDTH */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Form.Item label="Solution" name="solution">
              <MDEditor data-color-mode={mode as "light" | "dark"} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Create>
  );
};
