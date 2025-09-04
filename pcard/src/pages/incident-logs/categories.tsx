import { useEffect, useMemo, useState } from "react";
import { Card, Table, Space, Button, Modal, Form, Input, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { DeleteButton } from "@refinedev/antd";
import { useApiUrl } from "@refinedev/core";
import axios from "axios";

type Category = { id: string; title: string };
type Props = { onReady?: (api: { openCreate: () => void }) => void };

export default function CategoriesBox({ onReady }: Props) {
  const API_URL = useApiUrl();
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const [createForm] = Form.useForm<{ title: string }>();
  const [editForm] = Form.useForm<{ title: string }>();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Category[]>(`${API_URL}/categories`);
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const showCreate = () => {
    createForm.resetFields();
    setCreateOpen(true);
  };

  const showEdit = (id: string) => {
    const item = data.find((x) => String(x.id) === String(id));
    if (!item) return;
    setEditTarget(item);
    editForm.setFieldsValue({ title: item.title });
    setEditOpen(true);
  };

  useEffect(() => {
    onReady?.({ openCreate: showCreate });
  }, [onReady]);

  const createSubmit = async () => {
    const vals = await createForm.validateFields();
    try {
      await axios.post(`${API_URL}/categories`, { id: `${Date.now()}`, title: vals.title.trim() });
      setCreateOpen(false);
      await fetchAll();
      message.success("Category created");
    } catch {
      message.error("Create failed");
    }
  };

  const editSubmit = async () => {
    const vals = await editForm.validateFields();
    if (!editTarget) return;
    try {
      await axios.patch(`${API_URL}/categories/${editTarget.id}`, { title: vals.title.trim() });
      setEditOpen(false);
      setEditTarget(null);
      await fetchAll();
      message.success("Category updated");
    } catch {
      message.error("Update failed");
    }
  };

  const columns = useMemo(
    () => [
      { title: "Title", dataIndex: "title" },
      {
        title: "Actions",
        dataIndex: "actions",
        width: 120,
        render: (_: any, record: Category) => (
          <Space onClick={(e) => e.stopPropagation()}>
            <Button size="small" className="ant-btn-icon-only" icon={<EditOutlined />} onClick={() => showEdit(record.id)} aria-label="Edit" />
            <DeleteButton
              hideText
              size="small"
              resource="categories"
              recordItemId={record.id}
              onSuccess={fetchAll}
              confirmTitle="Delete category?"
              confirmOkText="Delete"
            />
          </Space>
        ),
      },
    ],
    [data],
  );

  return (
    <Card className="panel-card categories-card">
      <Table<Category> rowKey="id" size="middle" className="categories-table" loading={loading} dataSource={data} columns={columns as any} />

      <Modal open={createOpen} onCancel={() => setCreateOpen(false)} onOk={createSubmit} title="Add Category" okText="Create" destroyOnClose>
        <Form form={createForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title" }]}>
            <Input placeholder="Category title" maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={editOpen} onCancel={() => { setEditOpen(false); setEditTarget(null); }} onOk={editSubmit} title="Edit Category" okText="Save" destroyOnClose>
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title" }]}>
            <Input placeholder="Category title" maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
