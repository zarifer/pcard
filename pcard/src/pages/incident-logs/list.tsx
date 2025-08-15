import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  MarkdownField,
  useTable,
  CreateButton,
} from "@refinedev/antd";
import { type BaseRecord, useMany } from "@refinedev/core";
import { Space, Table, Tabs, Typography, Card } from "antd";
import CategoriesBox from "./categories";
import { useNavigation } from "@refinedev/core";

const { Title } = Typography;

export const IncidentLogList = () => {
  /* THREE TABLES – STABLE HOOK ORDER */
  const { show } = useNavigation();
  const openTbl = useTable({
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "status", operator: "eq", value: "open" }],
    },
  });
  const closedTbl = useTable({
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "status", operator: "eq", value: "closed" }],
    },
  });
  const draftTbl = useTable({
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "status", operator: "eq", value: "draft" }],
    },
  });

  const ds =
    openTbl.tableProps.dataSource ||
    closedTbl.tableProps.dataSource ||
    draftTbl.tableProps.dataSource ||
    [];

  const { data: categoryData, isLoading: categoryIsLoading } = useMany({
    resource: "categories",
    ids: ds.map((r: any) => r?.category?.id).filter(Boolean),
    queryOptions: { enabled: ds.length > 0 },
  });

  const { data: companyData, isLoading: companyIsLoading } = useMany({
    resource: "companies",
    ids: ds.map((r: any) => r?.company?.id).filter(Boolean),
    queryOptions: { enabled: ds.length > 0 },
  });

  const columns = [
    { dataIndex: "id", title: "ID", width: 80 },
    {
      dataIndex: "company",
      title: "Company",
      width: 180,
      render: (value: any) =>
        companyIsLoading
          ? "…"
          : companyData?.data?.find((c: any) => c.id === value?.id)?.product,
    },
    { dataIndex: "title", title: "Title" },
    {
      dataIndex: "detail",
      title: "Detail",
      render: (value: any) =>
        value ? (
          <MarkdownField value={String(value).slice(0, 120) + "..."} />
        ) : (
          "-"
        ),
    },
    {
      dataIndex: "category",
      title: "Incident type",
      width: 160,
      render: (value: any) =>
        categoryIsLoading
          ? "…"
          : categoryData?.data?.find((i: any) => i.id === value?.id)?.title,
    },
    { dataIndex: "status", title: "Status", width: 110 },
    {
      dataIndex: ["createdAt"],
      title: "Created at",
      width: 180,
      render: (value: any, r: any) => (
        <DateField value={value ?? r?.CreatedAt} />
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      width: 140,
      render: (_: any, record: BaseRecord) => (
        <Space
          onClick={(e) => e.stopPropagation() /* DO NOT TRIGGER ROW CLICK */}
        >
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  return (
    <List title="Incident logs" canCreate={false} headerButtons={null}>
      <Tabs
        defaultActiveKey="open"
        items={[
          {
            key: "open",
            label: "Open",
            children: (
              <Card className="panel-card">
                <div className="panel-header">
                  <Title level={5} className="panel-title">
                    Open
                  </Title>
                  <div className="panel-actions">
                    <CreateButton className="btn-primary" />
                  </div>
                </div>
                <Table
                  {...openTbl.tableProps}
                  rowKey="id"
                  columns={columns as any}
                  onRow={(record: any) => ({
                    onClick: () =>
                      show("incident_logs", record.id)
                  })}
                />
              </Card>
            ),
          },
          {
            key: "closed",
            label: "Closed",
            children: (
              <Card className="panel-card">
                <div className="panel-header">
                  <Title level={5} className="panel-title">
                    Closed
                  </Title>
                  <div className="panel-actions">
                    <CreateButton className="btn-primary" />
                  </div>
                </div>
                <Table
                  {...closedTbl.tableProps}
                  rowKey="id"
                  columns={columns as any}
                  onRow={(record: any) => ({
                    onClick: () =>
                      show("incident_logs", record.id)
                  })}
                />
              </Card>
            ),
          },
          {
            key: "draft",
            label: "Draft",
            children: (
              <Card className="panel-card">
                <div className="panel-header">
                  <Title level={5} className="panel-title">
                    Draft
                  </Title>
                  <div className="panel-actions">
                    <CreateButton className="btn-primary" />
                  </div>
                </div>
                <Table
                  {...draftTbl.tableProps}
                  rowKey="id"
                  columns={columns as any}
                  onRow={(record: any) => ({
                    onClick: () =>
                      show("incident_logs", record.id)
                  })}
                />
              </Card>
            ),
          },
          {
            key: "categories",
            label: "Categories",
            children: <CategoriesBox />,
          },
        ]}
      />
    </List>
  );
};
