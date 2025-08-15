import {
  DateField,
  MarkdownField,
  Show,
  TextField,
  EditButton,
  DeleteButton,
} from "@refinedev/antd";
import { useOne, useShow } from "@refinedev/core";
import { Card, Typography, Row, Col, Descriptions, Space, Tag } from "antd";

const { Title, Text } = Typography;

export const IncidentLogShow = () => {
  const { queryResult } = useShow({});
  const { data, isLoading } = queryResult;
  const record: any = data?.data;

  const { data: companyData } = useOne({
    resource: "companies",
    id: record?.company?.id || "",
    queryOptions: { enabled: !!record?.company?.id },
  });

  const { data: categoryData } = useOne({
    resource: "categories",
    id: record?.category?.id || "",
    queryOptions: { enabled: !!record?.category?.id },
  });

  /* TIMESTAMPS WITH FALLBACKS */
  const created = record?.createdAt ?? record?.CreatedAt ?? null;
  const updated = record?.updatedAt ?? record?.UpdatedAt ?? null;

  /* STATUS TAG COLOR HELPER */
  const statusTag = (s?: string) => {
    const v = String(s || "").toLowerCase();
    const color = v === "open" ? "green" : v === "closed" ? "red" : "gold";
    return <Tag color={color}>{s || "—"}</Tag>;
  };

  return (
    <Show isLoading={isLoading} headerButtons={() => null}>
      <Card className="incident-show">
        <div className="panel-header">
          <Title level={4} className="panel-title" style={{ marginBottom: 0 }}>
            Incident log
          </Title>
          <Space className="panel-actions">
            <EditButton />
            <DeleteButton />
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Descriptions
              className="inc-descriptions"
              bordered
              size="small"
              column={1}
              labelStyle={{ width: 140 }}
            >
              <Descriptions.Item label="Company">
                <Text>{companyData?.data?.product || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Title">
                <TextField value={record?.title} />
              </Descriptions.Item>

              <Descriptions.Item label="Incident type">
                <Text>{categoryData?.data?.title || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                {statusTag(record?.status)}
              </Descriptions.Item>

              <Descriptions.Item label="Created at">
                <DateField value={created} />
              </Descriptions.Item>

              <Descriptions.Item label="Updated at">
                <DateField value={updated} />
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} lg={16}>
            <Card className="md-card" title="Detail">
              <div className="md-block">
                <MarkdownField value={record?.detail} />
              </div>
            </Card>

            <Card
              className="md-card"
              title="Solution"
              style={{ marginTop: 16 }}
            >
              <div className="md-block">
                <MarkdownField
                  value={record?.solution || "_No solution provided yet._"}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </Show>
  );
};
