import { useEffect } from 'react';
import { Button, Tag, Space } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { salesOrdersApi } from '@api/tenant.api';

const statusColor = { DRAFT: 'default', CONFIRMED: 'blue', SHIPPED: 'orange', COMPLETED: 'green', CANCELLED: 'red' };

export default function SalesOrders() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(salesOrdersApi.list);
  const { execute: confirm } = useApi(salesOrdersApi.confirm, { onSuccess: fetch });
  const { execute: ship } = useApi(salesOrdersApi.ship, { onSuccess: fetch });
  const { execute: complete } = useApi(salesOrdersApi.complete, { onSuccess: fetch });

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Order #', dataIndex: 'orderNumber' },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Total', dataIndex: 'totalAmount', render: (v) => `$${v}` },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleDateString() },
    {
      title: 'Actions', render: (_, row) => (
        <Space size="small">
          {row.status === 'DRAFT' && <Button size="small" onClick={() => confirm(row.id)}>Confirm</Button>}
          {row.status === 'CONFIRMED' && <Button size="small" onClick={() => ship(row.id)}>Ship</Button>}
          {row.status === 'SHIPPED' && <Button size="small" type="primary" onClick={() => complete(row.id)}>Complete</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Sales Orders" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
