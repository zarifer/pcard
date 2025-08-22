import {
  useList,
  useNavigation,
  useDelete,
  useInvalidate,
} from "@refinedev/core";
import { List, CreateButton } from "@refinedev/antd";
import {
  Row,
  Col,
  Card,
  Avatar,
  Typography,
  Input,
  Dropdown,
  Button,
  App,
} from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined, SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import "./index.css";

export default function CompanyList() {
  const { data } = useList({ resource: "companies" });
  const { show, push } = useNavigation();
  const [search, setSearch] = useState("");
  const { modal } = App.useApp();
  const { mutate: deleteCompany } = useDelete();
  const invalidate = useInvalidate();

  const filtered =
    data?.data?.filter((company: any) =>
      (company.name || company.vendor || "-")
        .toString()
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];

  const onMenuClick = (key: string, company: any) => {
    if (key === "incidents") {
      push(`/companies/show/${company.id}?tab=incidents`);
      return;
    }
    if (key === "edit") {
      push(`/companies/edit/${company.id}`);
      return;
    }
    if (key === "delete") {
      modal.confirm({
        title: `Do you really want to delete ${company.product || company.name || "product's card"}?`,
        okText: "Delete",
        cancelText: "Cancel",
        okButtonProps: { danger: true },
        onOk: () =>
          deleteCompany(
            { resource: "companies", id: company.id },
            {
              onSuccess: () => {
                invalidate({ resource: "companies", invalidates: ["list"] });
              },
            },
          ),
      });
    }
  };

  return (
    <List title="Companies" canCreate={false} headerButtons={() => null}>
      <div className="toolbar">
        <Input.Search
          className="toolbar__search"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(v) => setSearch(v)}
          allowClear
          enterButton={<Button type="primary" icon={<SearchOutlined />} />}
        />
        <CreateButton resource="companies">Add Company</CreateButton>
      </div>

      <Row gutter={[24, 24]}>
        {filtered.map((company: any) => {
          const emails: string[] = Array.isArray(company.emails)
            ? company.emails.slice(0, 2)
            : company.email
              ? [company.email]
              : [];

          const menuItems: MenuProps["items"] = [
            { key: "incidents", label: "Show Incident Logs" },
            { key: "edit", label: "Edit Card" },
            { type: "divider" },
            {
              key: "delete",
              label: <span className="danger-text">Delete Card</span>,
            },
          ];

          return (
            <Col xs={24} sm={12} md={8} lg={6} key={company.id}>
              <Card
                hoverable
                className="company-card company-card--clickable"
                onClick={() => show("companies", company.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    show("companies", company.id);
                  }
                }}
                actions={
                  emails.length
                    ? emails.map((e, idx) => (
                        <span
                          className="company-card__emails"
                          key={`${e}-${idx}`}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <a href={`mailto:${encodeURIComponent(e)}`}>{e}</a>
                        </span>
                      ))
                    : [
                        <span
                          key="no-email"
                          className="company-card__emails"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          No contact
                        </span>,
                      ]
                }
              >
                <div
                  className="company-card__menu"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  <Dropdown
                    menu={{
                      items: menuItems,
                      onClick: ({ key }) => onMenuClick(String(key), company),
                    }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      shape="circle"
                      icon={<MoreOutlined />}
                    />
                  </Dropdown>
                </div>

                <Card.Meta
                  avatar={
                    <Avatar src={company.logo} size={48}>
                      {(company.name || "?").charAt(0)}
                    </Avatar>
                  }
                  title={
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {company.product}
                    </Typography.Title>
                  }
                  description={
                    <Typography.Text className="company-card__vendor">
                      {company.name || "—"}
                    </Typography.Text>
                  }
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </List>
  );
}
