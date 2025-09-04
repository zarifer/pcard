import { useMany, useList, useNavigation } from "@refinedev/core";
import { useTable, List, CreateButton, EditButton, DeleteButton, DateField } from "@refinedev/antd";
import { Table, Input, Space, Typography, Card, Tabs, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState, useRef } from "react";
import CategoriesBox from "./categories";

const { Title } = Typography;

export default function IncidentLogList() {
  const allTbl = useTable({ resource: "incident_logs", pagination: { pageSize: 10 }, syncWithLocation: true });
  const openTbl = useTable({ resource: "incident_logs", pagination: { pageSize: 10 }, syncWithLocation: false, filters: { permanent: [{ field: "status", operator: "eq", value: "open" }] } });
  const closedTbl = useTable({ resource: "incident_logs", pagination: { pageSize: 10 }, syncWithLocation: false, filters: { permanent: [{ field: "status", operator: "eq", value: "closed" }] } });
  const draftTbl = useTable({ resource: "incident_logs", pagination: { pageSize: 10 }, syncWithLocation: false, filters: { permanent: [{ field: "status", operator: "eq", value: "draft" }] } });

  const { show, create } = useNavigation();

  const rows = (allTbl.tableProps?.dataSource ?? []) as any[];
  const { data: companiesRes } = useList({ resource: "companies", pagination: { pageSize: 1000 }, queryOptions: { staleTime: 60000 } });
  const companies: any[] = companiesRes?.data ?? [];
  const companyById = useMemo(() => { const m = new Map<string, any>(); companies.forEach((c) => m.set(String(c.id), c)); return m; }, [companies]);

  const categoryIds = Array.from(new Set(rows.map((r: any) => r?.category?.id).filter(Boolean)));
  const { data: categoriesRes } = useMany({ resource: "categories", ids: categoryIds, queryOptions: { enabled: categoryIds.length > 0 } });
  const catTitle = (id?: string) => categoriesRes?.data?.find((c: any) => c.id === id)?.title ?? "—";

  const [q, setQ] = useState("");
  const filterRows = (src: any[]) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return src;
    return src.filter((r: any) => {
      const comp = r?.company?.id ? companyById.get(String(r.company.id)) : undefined;
      const hay = [comp?.name, comp?.productId, r?.detail].filter(Boolean).map((s) => String(s).toLowerCase()).join(" ");
      return hay.includes(needle);
    });
  };

  const [ilogSort, setIlogSort] = useState<{ key: "company" | "status" | "created" | null; order: "ascend" | "descend" | null; }>({ key: null, order: null });

  const sortRows = (src: any[]) => {
    if (!ilogSort.key || !ilogSort.order) return src;
    const dir = ilogSort.order === "ascend" ? 1 : -1;
    return [...src].sort((a: any, b: any) => {
      if (ilogSort.key === "company") {
        const an = a?.company?.id ? (companyById.get(String(a.company.id))?.name ?? "") : "";
        const bn = b?.company?.id ? (companyById.get(String(b.company.id))?.name ?? "") : "";
        return an.localeCompare(bn) * dir;
      }
      if (ilogSort.key === "status") return String(a?.status ?? "").localeCompare(String(b?.status ?? "")) * dir;
      if (ilogSort.key === "created") {
        const av = new Date(a?.createdAt ?? a?.CreatedAt ?? a?.incidentDate ?? 0).valueOf();
        const bv = new Date(b?.createdAt ?? b?.CreatedAt ?? b?.incidentDate ?? 0).valueOf();
        return (av - bv) * dir;
      }
      return 0;
    });
  };

  const columns: ColumnsType<any> = [
    { title: "Product ID", dataIndex: "productId", width: 140, render: (_: any, r: any) => { const c = r?.company?.id ? companyById.get(String(r.company.id)) : null; return c?.productId ?? "—"; } },
    { title: "Company", dataIndex: ["company", "id"], render: (_: any, r: any) => { const c = r?.company?.id ? companyById.get(String(r.company.id)) : null; return c?.name ?? "—"; } },
    { title: "Detail", dataIndex: "detail", ellipsis: true, render: (v: any) => v ? String(v).slice(0, 80) + (String(v).length > 80 ? "…" : "") : "—" },
    { title: "Incident Type", dataIndex: ["category", "id"], width: 240, render: (_: any, r: any) => catTitle(r?.category?.id) },
    { title: "Status", dataIndex: "status", width: 110, render: (v: any) => v ?? "—" },
    { title: "Created", dataIndex: "createdAt", width: 120, render: (_: any, r: any) => { const val = r?.createdAt ?? r?.CreatedAt ?? r?.incidentDate; return val ? <DateField value={val} format="DD/MM/YYYY" /> : "—"; } },
    { title: "Actions", dataIndex: "actions", width: 120, render: (_: any, r: any) => (<Space size="small" onClick={(e) => e.stopPropagation()}><EditButton hideText size="small" resource="incident_logs" recordItemId={r?.id} /><DeleteButton hideText size="small" resource="incident_logs" recordItemId={r?.id} /></Space>) },
  ];

  const renderTable = (tableProps: any) => {
    const base = filterRows(tableProps.dataSource ?? []);
    const data = sortRows(base);
    return (
      <Card className="panel-card">
        <Table {...tableProps} rowKey="id" columns={columns as any} dataSource={data} onRow={(record: any) => ({ onClick: () => show("incident_logs", record.id) })} />
      </Card>
    );
  };

  const [activeTab, setActiveTab] = useState("all");
  const catCreateRef = useRef<null | (() => void)>(null);

  return (
    <List
      title="Incident logs"
      canCreate={false}
      headerButtons={() => null}
      headerProps={{ title: <Title level={4} style={{ margin: 0 }}>Incident Logs</Title> }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
tabBarExtraContent={
  <Space>
    <Input.Search
      allowClear
      placeholder="Search Company or Product ID…"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      onSearch={(v) => setQ(v)}
      enterButton={false}
      style={{ width: 340 }}
    />
    {activeTab === "categories" ? (
      <CreateButton resource="categories" onClick={() => catCreateRef.current?.()}>
        Add Category
      </CreateButton>
    ) : (
      <CreateButton resource="incident_logs">
        Add Incident
      </CreateButton>
    )}
  </Space>
}

        items={[
          { key: "all", label: "All", children: renderTable(allTbl.tableProps) },
          { key: "open", label: "Open", children: renderTable(openTbl.tableProps) },
          { key: "closed", label: "Closed", children: renderTable(closedTbl.tableProps) },
          { key: "draft", label: "Draft", children: renderTable(draftTbl.tableProps) },
          { key: "categories", label: "Categories", children: <CategoriesBox onReady={(api) => { catCreateRef.current = api.openCreate; }} /> },
        ]}
      />
    </List>
  );
}
