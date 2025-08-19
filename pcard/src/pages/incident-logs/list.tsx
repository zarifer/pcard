import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  CreateButton,
  useTable,
} from "@refinedev/antd";
import { useNavigation, useMany } from "@refinedev/core";
import { BaseRecord } from "@refinedev/core";
import { Space, Table, Tabs, Typography, Card } from "antd";

const { Title } = Typography;

export const IncidentLogList = () => {
  const { show } = useNavigation();

  const COL_W = {
    id: 80,
    company: 260,
    title: 140,
    category: 300,
    status: 110,
    created: 180,
    actions: 140,
  };

  const allTbl = useTable({ syncWithLocation: false });
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

  /* COLLECT LOOKUP IDS FROM ANY NON-EMPTY DS */
  const ds =
    allTbl.tableProps.dataSource ||
    openTbl.tableProps.dataSource ||
    closedTbl.tableProps.dataSource ||
    draftTbl.tableProps.dataSource ||
    [];

  const { data: companyData, isLoading: companyIsLoading } = useMany({
    resource: "companies",
    ids: ds.map((r: any) => r?.company?.id).filter(Boolean),
    queryOptions: { enabled: ds.length > 0 },
  });

  const { data: categoryData, isLoading: categoryIsLoading } = useMany({
    resource: "categories",
    ids: ds.map((r: any) => r?.category?.id).filter(Boolean),
    queryOptions: { enabled: ds.length > 0 },
  });

  /* REUSABLE COLUMNS */
  const columns = [
    { dataIndex: "id", title: "ID", width: COL_W.id },
    {
      dataIndex: "company",
      title: "Company",
      width: COL_W.company,
      render: (value: any) =>
        companyIsLoading
          ? "…"
          : companyData?.data?.find((c: any) => c.id === value?.id)?.name ||
            "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }) /* PREVENT WRAP */,
    },
    {
      dataIndex: "title",
      title: "Title",
      width: COL_W.title,
      ellipsis: true /* KEEP IT TIGHT */,
    },
    {
      dataIndex: "detail",
      title: "Detail",
      /* FLEX COLUMN: DO NOT SET WIDTH, LET IT FILL FREE SPACE */
      render: (value: any) => (value ? String(value).slice(0, 120) + "…" : "—"),
    },
    {
      dataIndex: "category",
      title: "Incident type",
      width: COL_W.category,
      render: (value: any) =>
        categoryIsLoading
          ? "…"
          : categoryData?.data?.find((i: any) => i.id === value?.id)?.title ||
            "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }) /* FIT FULL TEXT */,
    },
    { dataIndex: "status", title: "Status", width: COL_W.status },
    {
      dataIndex: "createdAt",
      title: "Created at",
      width: COL_W.created,
      render: (value: any, r: any) => (
        <DateField value={value ?? r?.CreatedAt} />
      ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      width: COL_W.actions,
      render: (_: any, record: BaseRecord) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <EditButton hideText size="small" recordItemId={record.id} />
          <DeleteButton hideText size="small" recordItemId={record.id} />
        </Space>
      ),
    },
  ];

  /* REUSABLE TABLE RENDERER */
  const renderTable = (tableProps: any, title: string) => (
    <Card className="panel-card">
      <div className="panel-header">
        <Title level={5} className="panel-title">
          {title}
        </Title>
        <div className="panel-actions">
          <CreateButton className="btn-primary" />
        </div>
      </div>
      <Table
        {...tableProps}
        tableLayout="fixed" /* ENFORCE COLUMN WIDTHS */
        rowKey="id"
        columns={columns as any}
        onRow={(record: any) => ({
          onClick: () => show("incident_logs", record.id),
        })}
      />
    </Card>
  );

  return (
    <List title="Incident logs" canCreate={false} headerButtons={null}>
      <Tabs
        defaultActiveKey="all"
        items={[
          {
            key: "all",
            label: "All",
            children: renderTable(allTbl.tableProps, "All"),
          },
          {
            key: "open",
            label: "Open",
            children: renderTable(openTbl.tableProps, "Open"),
          },
          {
            key: "closed",
            label: "Closed",
            children: renderTable(closedTbl.tableProps, "Closed"),
          },
          {
            key: "draft",
            label: "Draft",
            children: renderTable(draftTbl.tableProps, "Draft"),
          },
        ]}
      />
    </List>
  );
};
