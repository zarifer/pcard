import { useList, useNavigation } from "@refinedev/core";
import { List, CreateButton } from "@refinedev/antd";
import { Row, Col, Card, Avatar, Typography, Input } from "antd";
import { useState } from "react";
import "./index.css";

export default function CompanyList() {
  const { data } = useList({ resource: "companies" });
  const { show } = useNavigation();
  const [search, setSearch] = useState("");

  const filtered =
    data?.data?.filter((company: any) =>
      (company.name || company.vendor || "-")
        .toString()
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];

  return (
    <List title="Companies" canCreate={false} headerButtons={() => null}>
      {/* TOP TOOLBAR: SEARCH + CREATE */}
      <div className="toolbar">
        <Input.Search
          className="toolbar__search"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
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
