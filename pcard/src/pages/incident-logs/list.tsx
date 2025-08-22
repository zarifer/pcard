import { useNavigation, useMany, useList } from "@refinedev/core";
import {
  useTable,
  List,
  EditButton,
  DeleteButton,
  DateField,
  CreateButton,
} from "@refinedev/antd";
import { Table, Input, Space, Typography, Card, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import CategoriesBox from "./categories";
import { SearchOutlined } from "@ant-design/icons";

const { Title } = Typography;

export default function IncidentLogList() {
  const { show } = useNavigation();

  const allTbl = useTable({
    resource: "incident_logs",
    pagination: { pageSize: 10 },
    syncWithLocation: true,
  });

  const openTbl = useTable({
    resource: "incident_logs",
    pagination: { pageSize: 10 },
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "status", operator: "eq", value: "open" }],
    },
  });

  const closedTbl = useTable({
    resource: "incident_logs",
    pagination: { pageSize: 10 },
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "status", operator: "eq", value: "closed" }],
    },
  });

  const draftTbl = useTable({
    resource: "incident_logs",
    pagination: { pageSize: 10 },
    syncWithLocation: false,
    filters: {
      permanent: [{ field: "status", operator: "eq", value: "draft" }],
    },
  });

  const rows = (allTbl.tableProps?.dataSource ?? []) as any[];

  const { data: companiesRes } = useList({
    resource: "companies",
    pagination: { pageSize: 1000 },
    queryOptions: { staleTime: 60000 },
  });
  const companies: any[] = companiesRes?.data ?? [];
  const companyById = useMemo(() => {
    const m = new Map<string, any>();
    companies.forEach((c) => m.set(String(c.id), c));
    return m;
  }, [companies]);

  const categoryIds = Array.from(
    new Set(rows.map((r: any) => r?.category?.id).filter(Boolean)),
  );
  const { data: categoriesRes } = useMany({
    resource: "categories",
    ids: categoryIds,
    queryOptions: { enabled: categoryIds.length > 0 },
  });
  const catTitle = (id?: string) =>
    categoriesRes?.data?.find((c: any) => c.id === id)?.title ?? "—";

  const [q, setQ] = useState("");
  const filterRows = (src: any[]) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return src;
    return src.filter((r: any) => {
      const comp = r?.company?.id
        ? companyById.get(String(r.company.id))
        : undefined;
      const hay = [comp?.name, comp?.productId, r?.detail]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase())
        .join(" ");
      return hay.includes(needle);
    });
  };

  const columns: ColumnsType<any> = [
    {
      title: "Product ID",
      dataIndex: "productId",
      width: 140,
      render: (_: any, r: any) => {
        const c = r?.company?.id ? companyById.get(String(r.company.id)) : null;
        return c?.productId ?? "—";
      },
    },
    {
      title: "Company",
      dataIndex: ["company", "id"],
      render: (_: any, r: any) => {
        const c = r?.company?.id ? companyById.get(String(r.company.id)) : null;
        return c?.name ?? "—";
      },
      sorter: true,
    },
    {
      title: "Detail",
      dataIndex: "detail",
      ellipsis: true,
      render: (v: any) =>
        v ? String(v).slice(0, 80) + (String(v).length > 80 ? "…" : "") : "—",
    },
    {
      title: "Incident type",
      dataIndex: ["category", "id"],
      width: 240,
      render: (_: any, r: any) => catTitle(r?.category?.id),
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v: any) => v ?? "—",
    },
{
  title: "Created",
  dataIndex: "createdAt",
  width: 120,
  sorter: true,
  render: (_: any, r: any) => {
    const val = r?.createdAt ?? r?.CreatedAt ?? r?.incidentDate;
    return val ? <DateField value={val} format="DD/MM/YYYY" /> : "—";
  },
},

    {
      title: "Actions",
      dataIndex: "actions",
      width: 120,
      render: (_: any, r: any) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <EditButton
            hideText
            size="small"
            resource="incident_logs"
            recordItemId={r?.id}
          />
          <DeleteButton
            hideText
            size="small"
            resource="incident_logs"
            recordItemId={r?.id}
          />
        </Space>
      ),
    },
  ];

  const renderTable = (tableProps: any, title: string) => (
    <Card className="panel-card">
      <div className="panel-header">
        <Title level={5} className="panel-title">
          {title}
        </Title>
        <div className="panel-actions">
          <CreateButton resource="incident_logs">Add Incident</CreateButton>
        </div>
      </div>
      <Table
        {...tableProps}
        tableLayout="fixed"
        rowKey="id"
        columns={columns as any}
        dataSource={[...filterRows(tableProps.dataSource ?? [])]}
        onRow={(record: any) => ({
          onClick: () => show("incident_logs", record.id),
        })}
        onChange={(pagination, filters, _sorter, extra) => {
          tableProps.onChange?.(pagination, filters, [], extra);
        }}
      />
    </Card>
  );

  return (
    <List
      title="Incident logs"
      canCreate={false}
      headerButtons={() => null}
      headerProps={{
        title: (
          <Space direction="vertical" size={2}>
            <Title level={4} style={{ margin: 0 }}>
              Incident logs
            </Title>
            <Input.Search
              allowClear
              placeholder="Search company or Product ID…"
              style={{ width: 340 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={(v) => setQ(v)}
              enterButton={<SearchOutlined />}
            />
          </Space>
        ),
      }}
    >
      <Tabs
        defaultActiveKey="all"
        items={[
          {
            key: "all",
            label: "All",
            children: renderTable(allTbl.tableProps, "All Logs"),
          },
          {
            key: "open",
            label: "Open",
            children: renderTable(openTbl.tableProps, "Open Logs"),
          },
          {
            key: "closed",
            label: "Closed",
            children: renderTable(closedTbl.tableProps, "Closed Logs"),
          },
          {
            key: "draft",
            label: "Draft",
            children: renderTable(draftTbl.tableProps, "Draft Logs"),
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
}
