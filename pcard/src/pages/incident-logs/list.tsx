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
import { Space, Table, Tabs, Typography, Card, Input } from "antd";
import { useMemo, useState } from "react";
import CategoriesBox from "./categories";

const { Title } = Typography;

const cmpText = (a: any, b: any) =>
  String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });

export const IncidentLogList = () => {
  const { show } = useNavigation();
  const [search, setSearch] = useState("");

  const COL_W = {
    id: 80,
    company: 260,
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

  const companyNameOf = (r: any) =>
    companyIsLoading
      ? ""
      : (companyData?.data?.find((c: any) => c.id === r?.company?.id)?.name ??
        "");

  const categoryTitleOf = (r: any) =>
    categoryIsLoading
      ? ""
      : (categoryData?.data?.find((i: any) => i.id === r?.category?.id)
          ?.title ?? "");

  const createdTs = (r: any) => {
    const v = r?.createdAt ?? r?.CreatedAt;
    const t = v ? new Date(v).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const filterByCompany = (rows: any[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => companyNameOf(r).toLowerCase().includes(q));
  };

  const columns = [
    {
      dataIndex: "company",
      title: "Company",
      width: COL_W.company,
      render: (value: any) =>
        companyIsLoading
          ? "…"
          : companyData?.data?.find((c: any) => c.id === value?.id)?.name ||
            "—",
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
      sorter: (a: any, b: any) => cmpText(companyNameOf(a), companyNameOf(b)),
      sortDirections: ["ascend", "descend"],
    },
    {
      dataIndex: "detail",
      title: "Detail",
      render: (value: any) => (value ? String(value).slice(0, 120) + "…" : "—"),
      sorter: (a: any, b: any) => cmpText(a?.detail, b?.detail),
      sortDirections: ["ascend", "descend"],
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
      onCell: () => ({ style: { whiteSpace: "nowrap" } }),
      sorter: (a: any, b: any) =>
        cmpText(categoryTitleOf(a), categoryTitleOf(b)),
      sortDirections: ["ascend", "descend"],
    },
    {
      dataIndex: "status",
      title: "Status",
      width: COL_W.status,
      sorter: (a: any, b: any) => cmpText(a?.status, b?.status),
      sortDirections: ["ascend", "descend"],
    },
    {
      dataIndex: "createdAt",
      title: "Created at",
      width: COL_W.created,
      render: (value: any, r: any) => (
        <DateField value={value ?? r?.CreatedAt} />
      ),
      sorter: (a: any, b: any) => createdTs(a) - createdTs(b),
      sortDirections: ["ascend", "descend"],
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

  const renderTable = (tableProps: any, title: string) => {
    const filteredData = useMemo(
      () => filterByCompany(tableProps.dataSource || []),
      [tableProps.dataSource, search, companyData, companyIsLoading],
    );

    return (
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
          dataSource={filteredData}
          tableLayout="fixed"
          rowKey="id"
          columns={columns as any}
          onRow={(record: any) => ({
            onClick: () => show("incident_logs", record.id),
          })}
          onChange={(pagination, filters, _sorter, extra) => {
            tableProps.onChange?.(pagination, filters, [], extra);
          }}
        />
      </Card>
    );
  };

  return (
    <List title="Incident logs" canCreate={false} headerButtons={null}>
      <div className="toolbar">
        <Input.Search
          className="toolbar__search"
          placeholder="Search by..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

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
};
