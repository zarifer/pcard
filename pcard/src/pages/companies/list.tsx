import { useList } from "@refinedev/core";
import {
  List,
  EditButton,
  DeleteButton,
  ShowButton,
  CreateButton,
} from "@refinedev/antd";
import { Row, Col, Card, Avatar, Typography, Input } from "antd";
import { useState } from "react";

export default function CompanyList() {
  const { data } = useList({ resource: "companies" });
  const [search, setSearch] = useState("");

  const filtered =
    data?.data?.filter((company) =>
      company.name?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  return (
    <List
      headerButtons={<CreateButton resource="companies" />}
      title="Companies"
    >
      <Input.Search
        placeholder="Search by..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 24, maxWidth: 350 }}
        allowClear
      />
      <Row gutter={[24, 24]}>
        {filtered.map((company) => (
          <Col xs={24} sm={12} md={8} lg={6} key={company.id}>
            <Card
              hoverable
              actions={[
                <ShowButton
                  resource="companies"
                  recordItemId={company.id}
                  key="view"
                />,
                <EditButton
                  resource="companies"
                  recordItemId={company.id}
                  key="edit"
                />,
                <DeleteButton
                  resource="companies"
                  recordItemId={company.id}
                  key="delete"
                />,
              ]}
            >
              <Card.Meta
                avatar={
                  <Avatar src={company.logo} size={48}>
                    {company.name?.charAt(0)}
                  </Avatar>
                }
                title={
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {company.name}
                  </Typography.Title>
                }
                description={
                  <>
                    <Typography.Text>{company.email}</Typography.Text>
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </List>
  );
}
