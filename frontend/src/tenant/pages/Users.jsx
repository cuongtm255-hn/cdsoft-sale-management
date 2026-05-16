import { useEffect, useState } from 'react';
import { Button, Tag, Modal, Form, Input, Select, Space } from 'antd';
import { PlusOutlined, LockOutlined, UnlockOutlined, KeyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { usersApi } from '@api/tenant.api';

const roleColor = {
  TENANT_ADMIN: 'purple',
  MANAGER: 'blue',
  ACCOUNTANT: 'cyan',
  WAREHOUSE: 'orange',
  STAFF: 'default',
};

export default function TenantUsers() {
  const { t } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const { fetch, loading, data, pagination, onTableChange } = usePagination(usersApi.list);

  const { execute: createUser, loading: creating } = useApi(usersApi.create, {
    successMessage: t('users.created'),
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
    successMessage: t('users.passwordChanged'),
    onSuccess: () => {
      setPwdModalOpen(false);
      pwdForm.resetFields();
    },
  });

  useEffect(() => { fetch(); }, []);

  const roleOptions = [
    { label: t('users.roleTenantAdmin'), value: 'TENANT_ADMIN' },
    { label: t('users.roleManager'), value: 'MANAGER' },
    { label: t('users.roleAccountant'), value: 'ACCOUNTANT' },
    { label: t('users.roleWarehouse'), value: 'WAREHOUSE' },
    { label: t('users.roleStaff'), value: 'STAFF' },
  ];

  const roleLabels = {
    TENANT_ADMIN: t('users.roleTenantAdmin'),
    MANAGER: t('users.roleManager'),
    ACCOUNTANT: t('users.roleAccountant'),
    WAREHOUSE: t('users.roleWarehouse'),
    STAFF: t('users.roleStaff'),
  };

  const columns = [
    { title: t('users.fullName'), dataIndex: 'fullName' },
    { title: t('users.email'), dataIndex: 'email' },
    {
      title: t('users.role'),
      dataIndex: 'role',
      render: (v) => <Tag color={roleColor[v]}>{roleLabels[v] ?? v}</Tag>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      render: (v) => (
        <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>
          {v === 'ACTIVE' ? t('users.statusActive') : t('users.statusInactive')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      render: (_, row) => (
        <Space size="small">
          {row.status === 'ACTIVE' ? (
            <Button
              icon={<LockOutlined />}
              size="small"
              danger
              onClick={() => toggleStatus(row.id, 'INACTIVE')}
            >
              {t('users.deactivate')}
            </Button>
          ) : (
            <Button
              icon={<UnlockOutlined />}
              size="small"
              onClick={() => toggleStatus(row.id, 'ACTIVE')}
            >
              {t('users.activate')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        extra={
          <Space>
            <Button
              icon={<KeyOutlined />}
              onClick={() => setPwdModalOpen(true)}
            >
              {t('users.changePassword')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              {t('users.addUser')}
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

      <Modal
        title={t('users.addUser')}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        onOk={() => addForm.submit()}
        confirmLoading={creating}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" onFinish={createUser}>
          <Form.Item name="fullName" label={t('users.fullName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t('users.email')} rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('users.password')}
            rules={[{ required: true }, { min: 8, message: t('users.minPasswordLength') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label={t('users.role')} rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="phone" label={t('users.phone')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('users.changePassword')}
        open={pwdModalOpen}
        onCancel={() => { setPwdModalOpen(false); pwdForm.resetFields(); }}
        onOk={() => pwdForm.submit()}
        confirmLoading={changingPwd}
        destroyOnHidden
      >
        <Form form={pwdForm} layout="vertical" onFinish={changePassword}>
          <Form.Item name="currentPassword" label={t('users.currentPassword')} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('users.newPassword')}
            rules={[{ required: true }, { min: 8, message: t('users.minPasswordLength') }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
