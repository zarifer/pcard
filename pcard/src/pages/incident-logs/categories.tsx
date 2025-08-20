import { HttpError, CrudFilters, BaseRecord } from "@refinedev/core";
import { useTable, DeleteButton, useModalForm, CreateButton } from "@refinedev/antd";
import { Button, Modal, Form, Input, Space, Table, Card, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";

const { Title } = Typography;

type Category = {
  id: number | string;
  title: string;
};

export default function CategoriesBox() {
  const {
    tableProps,
    tableQueryResult: { refetch },
  } = useTable<Category, HttpError, CrudFilters>({
    resource: "categories",
    syncWithLocation: false,
    pagination: { pageSize: 10 },
  });

  const {
    modalProps: createModalProps,
    formProps: createFormProps,
    show: showCreate,
  } = useModalForm<Category>({
    resource: "categories",
    action: "create",
    defaultVisible: false,
    autoSubmitClose: true,
    onMutationSuccess: () => refetch(),
  });

  const {
    modalProps: editModalProps,
    formProps: editFormProps,
    show: showEdit,
  } = useModalForm<Category>({
    resource: "categories",
    action: "edit",
    defaultVisible: false,
    autoSubmitClose: true,
    onMutationSuccess: () => refetch(),
  });

  return (
    <Card className="panel-card categories-card">
      <div className="panel-header">
        <Title level={5} className="panel-title">Categories</Title>
        <div className="panel-actions">
          <CreateButton
            resource="categories"
            onClick={(e) => {
              e.preventDefault();
              showCreate();
            }}
          >
            Add Category
          </CreateButton>
        </div>
      </div>

      <Table<Category>
        {...tableProps}
        rowKey="id"
        size="middle"
        className="categories-table"
      >
        <Table.Column<Category> dataIndex="title" title="Title" />
        <Table.Column<Category>
          title="Actions"
          dataIndex="actions"
          width={120}
          render={(_, record: BaseRecord) => (
            <Space onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                className="ant-btn-icon-only"
                icon={<EditOutlined />}
                onClick={() => showEdit(record.id)}
                aria-label="Edit"
              />
              <DeleteButton
                hideText
                size="small"
                resource="categories"
                recordItemId={record.id}
                onSuccess={() => refetch()}
                confirmTitle="Delete category?"
                confirmOkText="Delete"
              />
            </Space>
          )}
        />
      </Table>

      <Modal
        {...createModalProps}
        title="Create Category"
        okText="Save"
        destroyOnClose
        centered
        width={420}
        className="category-modal-small"
      >
        <Form {...createFormProps} layout="vertical">
          <Form.Item
            label="Title"
            name={["title"]}
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="e.g. Networking" maxLength={60} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        {...editModalProps}
        title="Edit Category"
        okText="Save"
        destroyOnClose
        centered
        width={420}
        className="category-modal-small"
      >
        <Form {...editFormProps} layout="vertical">
          <Form.Item
            label="Title"
            name={["title"]}
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input maxLength={60} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
