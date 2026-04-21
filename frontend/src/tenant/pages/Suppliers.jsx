import { useEffect } from 'react';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { suppliersApi } from '@api/tenant.api';

export default function Suppliers() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(suppliersApi.list);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Contact', dataIndex: 'contactName' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone' },
  ];

  return (
    <div>
      <PageHeader title="Suppliers" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
