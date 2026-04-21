import { useEffect } from 'react';
import { Button, Tag } from 'antd';
import { PlusOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { platformUsersApi } from '@api/platform.api';

export default function PlatformUsers() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(platformUsersApi.list);
  const { execute: toggleLock } = useApi(platformUsersApi.toggleLock, { onSuccess: () => fetch() });

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Username', dataIndex: 'username' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role', render: (v) => <Tag>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v}</Tag> },
    {
      title: 'Actions', render: (_, row) => (
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
      <PageHeader title="Platform Users" extra={<Button type="primary" icon={<PlusOutlined />}>Add User</Button>} />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
