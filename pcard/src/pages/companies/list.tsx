import { useList, useNavigation } from "@refinedev/core";
import { List, CreateButton } from "@refinedev/antd";
import { Row, Col, Card, Avatar, Typography, Input } from "antd";
import { useState } from "react";
import "./index.css";

export default function CompanyList() {
  const { data } = useList({ resource: "companies" });
  const { show } = useNavigation(); // /* OPEN SHOW PROGRAMMATICALLY */
  const [search, setSearch] = useState("");

  const filtered =
    data?.data?.filter((company: any) =>
      (company.name || "")
        .toString()
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];

  return (
    // /* REMOVE DEFAULT TOP-RIGHT HEADER BUTTONS (CRETE ETC.) */
    <List title="Companies" canCreate={false} headerButtons={() => null}>
      {/* TOP TOOLBAR: SEARCH + CREATE (ONLY HERE) */}
      <div className="toolbar">
        <Input.Search
          className="toolbar__search"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <CreateButton resource="companies" />
      </div>

      <Row gutter={[24, 24]}>
        {filtered.map((company: any) => {
          /* NORMALIZE EMAILS: SUPPORT ARRAY OR SINGLE STRING, MAX 2 */
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
                /* MAKE ENTIRE CARD OPEN THE SHOW VIEW */
                onClick={() => show("companies", company.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  // /* ACCESSIBLE: ENTER/SPACE SHOULD OPEN TOO */
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    show("companies", company.id);
                  }
                }}
                /* PUT CONTACT EMAILS INTO THE ACTIONS STRIP */
                actions={
                  emails.length
                    ? emails.map((e, idx) => (
                        <span
                          className="company-card__emails"
                          key={`${e}-${idx}`}
                          onClick={(ev) => ev.stopPropagation()} // /* DO NOT TRIGGER CARD CLICK */
                        >
                          <a href={`mailto:${encodeURIComponent(e)}`}>{e}</a>
                        </span>
                      ))
                    : [
                        <span
                          key="no-email"
                          className="company-card__emails"
                          onClick={(ev) => ev.stopPropagation()} // /* SAFEGUARD */
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
                      {company.name}
                    </Typography.Title>
                  }
                  /* DESCRIPTION: SHOW VENDOR INSTEAD OF EMAIL */
                  description={
                    <Typography.Text className="company-card__vendor">
                      {company.vendor || "—"}
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
