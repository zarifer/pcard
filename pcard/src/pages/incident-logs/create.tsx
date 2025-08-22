import { Create, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Select, DatePicker, Input, Row, Col } from "antd";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type Company = {
  id: string;
  name: string;
  productId?: string;
};

export default function IncidentLogCreate() {
  const { formProps, saveButtonProps } = useForm({
    resource: "incident_logs",
  });

  // all companies for mapping ID <-> company
  const { data: companiesRes } = useList<Company>({
    resource: "companies",
    pagination: { pageSize: 1000 },
  });
  const companies = companiesRes?.data ?? [];

  // categories (incident types)
  const { data: catsRes } = useList<any>({
    resource: "categories",
    pagination: { pageSize: 1000 },
  });
  const categories = catsRes?.data ?? [];

  // prefill from query (?companyId=...&productId=...)
  const loc = useLocation();
  useEffect(() => {
    const sp = new URLSearchParams(loc.search);
    const companyId = sp.get("companyId") || undefined;
    const productId = sp.get("productId") || undefined;
    if (companyId) {
      formProps.form?.setFieldsValue({
        company: { id: companyId },
      });
      const c = companies.find((x) => String(x.id) === String(companyId));
      if (c?.productId) {
        formProps.form?.setFieldsValue({ productId: c.productId });
      }
    }
    if (productId) {
      formProps.form?.setFieldsValue({ productId });
      const c = companies.find((x) => x.productId === productId);
      if (c) formProps.form?.setFieldsValue({ company: { id: c.id } });
    }
  }, [loc.search, companies, formProps.form]);
  useEffect(() => {
  if (!formProps.form) return;
  const cur = formProps.form.getFieldValue("status");
  if (!cur) formProps.form.setFieldsValue({ status: "draft" });
}, [formProps.form]);


  // keep the two fields in sync
  const onChangeProductId = (pid?: string) => {
    if (!pid) return;
    const c = companies.find((x) => x.productId === pid);
    if (c) formProps.form?.setFieldsValue({ company: { id: c.id } });
  };
  const onChangeCompany = (companyId?: string) => {
    const c = companies.find((x) => String(x.id) === String(companyId));
    if (c?.productId)
      formProps.form?.setFieldsValue({ productId: c.productId });
  };

  return (
    <Create title="Create Incident log" saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        className="form-compact"
 // create.tsx – onFinish csere
// a Form komponensen belül
onFinish={async (values) => {
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

  const now = new Date().toISOString();
  const incidentIso = v.incidentDate?.toISOString?.() ?? now;

  v.createdAt = incidentIso;
  v.updatedAt = now;
  delete v.incidentDate;

  return formProps.onFinish?.(v);
}}

      >
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Product ID"
              name="productId"
              rules={[{ required: true, message: "Product ID is required" }]}
            >
              <Select
                allowClear
                placeholder="Select Product ID"
                options={companies
                  .filter((c) => !!c.productId)
                  .map((c) => ({
                    value: c.productId!,
                    label: c.productId!,
                  }))}
                onChange={onChangeProductId}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Company"
              name={["company", "id"]}
              rules={[{ required: true, message: "Company is required" }]}
            >
              <Select
                allowClear
                placeholder="Select company"
                options={companies.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                onChange={(v) => onChangeCompany(String(v))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Incident type"
              name={["category", "id"]}
              rules={[{ required: true, message: "Incident type is required" }]}
            >
              <Select
                placeholder="Select type"
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.title,
                }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Incident date"
              name="incidentDate"
              rules={[{ required: true, message: "Incident date is required" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Detail"
          name="detail"
          rules={[{ required: true, message: "Detail is required" }]}
        >
          <Input.TextArea autoSize={{ minRows: 6 }} />
        </Form.Item>

        <Form.Item label="Solution" name="solution">
          <Input.TextArea autoSize={{ minRows: 4 }} />
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 200 }}>
            <Form.Item label="Status" name="status">
              <Select
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Create>
  );
}
