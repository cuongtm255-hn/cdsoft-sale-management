import { useEffect } from 'react';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { customersApi } from '@api/tenant.api';

export default function Customers() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(customersApi.list);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Address', dataIndex: 'address' },
    { title: 'Created', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Customers" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
