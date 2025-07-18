import { useShow } from "@refinedev/core";
import { Show } from "@refinedev/antd";
import { Card, Typography, Avatar } from "antd";


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
                            <Typography.Paragraph strong>Product name: </Typography.Paragraph>
                            <Typography.Text>{company.product}</Typography.Text><br/>
                            <Typography.Paragraph strong>Contact email: </Typography.Paragraph>
                            <Typography.Text>{company.email}</Typography.Text><br/>
                            <Typography.Paragraph strong>Gui: </Typography.Paragraph>
                            <Typography.Text>{company.gui}</Typography.Text><br/>
                            <Typography.Paragraph strong>Log path: </Typography.Paragraph>
                            <Typography.Text>{company.path}</Typography.Text><br/>
                            <Typography.Paragraph strong>Spec features: </Typography.Paragraph>
                            <Typography.Text>{company.features}</Typography.Text>
                        </>
                    }
                />
            </Card>
        </Show>
    );
}
