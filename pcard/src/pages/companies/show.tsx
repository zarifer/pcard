import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Card, Typography, Avatar } from "antd";
import MDEditor from "@uiw/react-md-editor";


export default function CompanyShowPage() {
    const { queryResult } = useShow();
    const company = queryResult?.data?.data;

    if (!company) return null;

    return (
        <Show title={company.name}>
            <Card>
                <Card.Meta
                    avatar={<Avatar src={company.logo} size={64}>{company.name?.charAt(0)}</Avatar>}
                    title={<Typography.Title level={4}>{company.name}</Typography.Title>}
                    description={
                        <>
                            <Typography.Paragraph strong>Industry: </Typography.Paragraph>
                            <Typography.Text>{company.industry}</Typography.Text><br/>
                            <Typography.Paragraph strong>Email: </Typography.Paragraph>
                            <Typography.Text>{company.email}</Typography.Text><br/>
                            <Typography.Paragraph strong>Phone: </Typography.Paragraph>
                            <Typography.Text>{company.phone}</Typography.Text><br/>
                            <Typography.Paragraph strong>Location: </Typography.Paragraph>
                            <Typography.Text>{company.location}</Typography.Text><br/>
                            <Typography.Paragraph strong>Description: </Typography.Paragraph>
                            <Typography.Text>{company.description}</Typography.Text>
                        </>
                    }
                />
            </Card>
        </Show>
    );
}
