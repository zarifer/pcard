import { Edit, useForm } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Form, Select, DatePicker, Input, Row, Col } from "antd";
import { useEffect } from "react";
import dayjs from "dayjs";

type Company = {
  id: string;
  name: string;
  productId?: string;
};

export default function IncidentLogEdit() {
  const { formProps, saveButtonProps, queryResult } = useForm({
    resource: "incident_logs",
  });

  const record = queryResult?.data?.data;

  const { data: companiesRes } = useList<Company>({
    resource: "companies",
    pagination: { pageSize: 1000 },
  });
  const companies = companiesRes?.data ?? [];

  const { data: catsRes } = useList<any>({
    resource: "categories",
    pagination: { pageSize: 1000 },
  });
  const categories = catsRes?.data ?? [];
  useEffect(() => {
    if (!record || !formProps.form) return;
    const src =
      record?.incidentDate ?? record?.createdAt ?? record?.CreatedAt ?? null;
    if (src) formProps.form.setFieldsValue({ incidentDate: dayjs(src) });
  }, [record, formProps.form]);

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
    <Edit saveButtonProps={saveButtonProps}>
      <Form
        layout="vertical"
        {...formProps}
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
          const incidentIso = v.incidentDate?.toISOString?.();
          if (incidentIso) {
            v.createdAt = incidentIso;
          } else if (
            record?.createdAt ||
            record?.CreatedAt ||
            record?.incidentDate
          ) {
            v.createdAt =
              record?.createdAt ?? record?.CreatedAt ?? record?.incidentDate;
          }
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
                  .map((c) => ({ value: c.productId!, label: c.productId! }))}
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
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
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
    </Edit>
  );
}
