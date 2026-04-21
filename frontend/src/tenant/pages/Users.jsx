import { useEffect } from 'react';
import { Tag } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { tenantApi } from '@api/axios';

const usersApi = { list: (params) => tenantApi.get('/tenant/users', { params }) };

export default function TenantUsers() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(usersApi.list);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'fullName' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role', render: (v) => <Tag>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v}</Tag> },
  ];

  return (
    <div>
      <PageHeader title="Users" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
