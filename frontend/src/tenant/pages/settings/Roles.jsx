import { useEffect, useState } from 'react';
import { Badge, Button, Form, Input, Modal, Space, Spin, Tabs, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import PermissionMatrix from '@tenant/components/PermissionMatrix';
import { rolesApi } from '@api/tenant.api';

export default function Roles() {
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form]                    = Form.useForm();
  const [creating, setCreating]   = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const load = () => {
    setLoading(true);
    rolesApi.list()
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setRoles(data);
        if (!activeTab && data.length) setActiveTab(data[0].id);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values) => {
    setCreating(true);
    try {
      const res  = await rolesApi.create({ ...values, permissions: [] });
      const role = res.data?.data ?? res.data;
      message.success('Đã tạo vai trò mới');
      setCreateOpen(false);
      form.resetFields();
      await load();
      setActiveTab(role.id);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Tạo thất bại');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Spin style={{ margin: 40 }} />;

  const tabItems = roles.map((role) => ({
    key:   role.id,
    label: (
      <Space size={4}>
        {role.label}
        {role.isSystem && <Tag color="blue" style={{ margin: 0 }}>Hệ thống</Tag>}
        <Badge count={role.userCount} style={{ background: '#bbb' }} />
      </Space>
    ),
    children: <PermissionMatrix key={role.id} role={role} onSaved={load} />,
  }));

  return (
    <div>
      <PageHeader
        title="Phân quyền vai trò"
        extra={
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo vai trò
          </Button>
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
      />

      <Modal
        title="Tạo vai trò mới"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input placeholder="VD: Nhân viên kho phụ" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Mã vai trò"
            rules={[
              { required: true },
              { pattern: /^[A-Z_]+$/, message: 'Chỉ dùng CHỮ HOA và dấu _' },
            ]}
          >
            <Input placeholder="VD: CUSTOM_WAREHOUSE" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
