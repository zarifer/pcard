import { HttpError, CrudFilters, BaseRecord } from "@refinedev/core";
import { useTable, DeleteButton, useModalForm } from "@refinedev/antd";
import {
  Button,
  Modal,
  Form,
  Input,
  Space,
  Table,
  Card,
  Typography,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";

const { Title } = Typography;

type Category = {
  id: number | string;
  title: string;
};

export default function CategoriesBox() {
  /* USE THE ANTD HOOK SO WE GET tableProps */
  const {
    tableProps,
    tableQueryResult: { refetch },
  } = useTable<Category, HttpError, CrudFilters>({
    resource: "categories",
    syncWithLocation: false,
    pagination: { pageSize: 10 },
  });

  /* MODAL FORM FOR CREATE */
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

  /* MODAL FORM FOR EDIT */
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
      {/* HEADER ROW: TITLE LEFT, ACTIONS RIGHT */}
      <div className="panel-header">
        <Title level={5} className="panel-title">Categories</Title>
        <div className="panel-actions">
          <Button
            type="primary"
            className="btn-primary"
            icon={<PlusOutlined />}
            onClick={() => showCreate()}
          >
            Create
          </Button>
        </div>
      </div>

      <Table<Category>
        {...tableProps}
        rowKey="id"
        size="small"
        className="categories-table"
      >
        <Table.Column<Category> dataIndex="id" title="ID" width={72} />
        <Table.Column<Category> dataIndex="title" title="Title" />
        <Table.Column<Category>
          title="Actions"
          dataIndex="actions"
          width={120}
          render={(_, record: BaseRecord) => (
            /* PREVENT ROW CLICK WHEN PRESSING ACTIONS */
            <Space onClick={(e) => e.stopPropagation()}>
              {/* MIMIC REFINED EDIT ICON-ONLY BUTTON */}
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

      {/* CREATE MODAL – SMALLER, CENTERED */}
      <Modal
        {...createModalProps}
        title="Create Category"
        okText="Save"
        destroyOnClose
        centered
        width={420}
        className="category-modal-small"
      >
        <Form
          {...createFormProps}
          layout="vertical"
          /* SECURITY: PREVENT EMPTY TITLES */
        >
          <Form.Item
            label="Title"
            name={["title"]}
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="e.g. Networking" maxLength={60} />
          </Form.Item>
        </Form>
      </Modal>

      {/* EDIT MODAL – SMALLER, CENTERED */}
      <Modal
        {...editModalProps}
        title="Edit Category"
        okText="Save"
        destroyOnClose
        centered
        width={420}
        className="category-modal-small"
      >
        <Form
          {...editFormProps}
          layout="vertical"
          /* SECURITY: PREVENT EMPTY/UNSANITIZED VALUES */
        >
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
