import { useEffect, useState } from 'react';
import { Button, Tag, Modal, Form, Input, Select, Space } from 'antd';
import { PlusOutlined, LockOutlined, UnlockOutlined, KeyOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { usersApi } from '@api/tenant.api';

const ROLE_OPTIONS = [
  { label: 'Tenant Admin', value: 'TENANT_ADMIN' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Accountant', value: 'ACCOUNTANT' },
  { label: 'Warehouse', value: 'WAREHOUSE' },
  { label: 'Staff', value: 'STAFF' },
];

const roleColor = {
  TENANT_ADMIN: 'purple',
  MANAGER: 'blue',
  ACCOUNTANT: 'cyan',
  WAREHOUSE: 'orange',
  STAFF: 'default',
};

export default function TenantUsers() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const { fetch, loading, data, pagination, onTableChange } = usePagination(usersApi.list);

  const { execute: createUser, loading: creating } = useApi(usersApi.create, {
    successMessage: 'User created',
    onSuccess: () => {
      setAddModalOpen(false);
      addForm.resetFields();
      fetch();
    },
  });

  const { execute: toggleStatus } = useApi(
    (id, status) => usersApi.updateStatus(id, { status }),
    { onSuccess: () => fetch() },
  );

  const { execute: changePassword, loading: changingPwd } = useApi(usersApi.changePassword, {
    successMessage: 'Password changed successfully',
    onSuccess: () => {
      setPwdModalOpen(false);
      pwdForm.resetFields();
    },
  });

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'fullName' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (v) => <Tag color={roleColor[v]}>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v}</Tag>,
    },
    {
      title: 'Actions',
      render: (_, row) => (
        <Space size="small">
          {row.status === 'ACTIVE' ? (
            <Button
              icon={<LockOutlined />}
              size="small"
              danger
              onClick={() => toggleStatus(row.id, 'INACTIVE')}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              icon={<UnlockOutlined />}
              size="small"
              onClick={() => toggleStatus(row.id, 'ACTIVE')}
            >
              Activate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        extra={
          <Space>
            <Button
              icon={<KeyOutlined />}
              onClick={() => setPwdModalOpen(true)}
            >
              Change Password
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              Add User
            </Button>
          </Space>
        }
      />

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
      />

      {/* Add User Modal */}
      <Modal
        title="Add User"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        onOk={() => addForm.submit()}
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={createUser}>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }, { min: 8, message: 'Minimum 8 characters' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title="Change Password"
        open={pwdModalOpen}
        onCancel={() => { setPwdModalOpen(false); pwdForm.resetFields(); }}
        onOk={() => pwdForm.submit()}
        confirmLoading={changingPwd}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={changePassword}>
          <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[{ required: true }, { min: 8, message: 'Minimum 8 characters' }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
