import { Edit, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, Select, Row, Col } from "antd";
import { useContext } from "react";
import { ColorModeContext } from "../../contexts/color-mode";

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
        className="form-compact"
        onFinish={async (values) => {
          /* NORMALIZE PAYLOAD FOR BACKEND COMPATIBILITY */
          const v: any = { ...values, updatedAt: new Date().toISOString() };

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
              {/* DARK/LIGHT SYNC; NO DANGEROUS HTML */}
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
    </Edit>
  );
};
