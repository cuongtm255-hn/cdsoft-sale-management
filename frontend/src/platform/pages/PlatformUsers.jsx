import { useEffect, useState } from 'react';
import { Button, Tag, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { platformUsersApi } from '@api/platform.api';

const ROLE_OPTIONS = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Platform Operator', value: 'PLATFORM_OPERATOR' },
];

export default function PlatformUsers() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { fetch, loading, data, pagination, onTableChange } = usePagination(platformUsersApi.list);
  const { execute: toggleLock } = useApi(platformUsersApi.toggleLock, { onSuccess: () => fetch() });
  const { execute: createUser, loading: creating } = useApi(platformUsersApi.create, {
    successMessage: 'User created',
    onSuccess: () => {
      setModalOpen(false);
      form.resetFields();
      fetch();
    },
  });

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Username', dataIndex: 'username' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role', render: (v) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v}</Tag>,
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <Button
          icon={row.status === 'LOCKED' ? <UnlockOutlined /> : <LockOutlined />}
          size="small"
          onClick={() => toggleLock(row.id)}
        >
          {row.status === 'LOCKED' ? 'Unlock' : 'Lock'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Platform Users"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Add User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
      />

      <Modal
        title="Add Platform User"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={createUser}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }, { min: 10, message: 'Minimum 10 characters' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
