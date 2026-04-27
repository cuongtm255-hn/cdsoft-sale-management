import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { warehousesApi } from '@api/tenant.api';

export default function Warehouses() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();

  const load = () => {
    setLoading(true);
    warehousesApi.list()
      .then((res) => setData(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit   = (row) => { setEditing(row); form.setFieldsValue(row); setOpen(true); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await warehousesApi.update(editing.id, values);
        message.success('Đã cập nhật kho');
      } else {
        await warehousesApi.create(values);
        message.success('Đã thêm kho mới');
      }
      setOpen(false);
      load();
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Tên kho',    dataIndex: 'name',    key: 'name' },
    { title: 'Địa chỉ',   dataIndex: 'address', key: 'address', render: (v) => v ?? '—' },
    {
      title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 120,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Đang dùng' : 'Ngưng'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, r) => <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kho hàng"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm kho
          </Button>
        }
      />

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: 'Chưa có kho nào' }}
        />
      </Card>

      <Modal
        title={editing ? 'Sửa kho' : 'Thêm kho mới'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên kho" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="isActive" label="Đang hoạt động" valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
