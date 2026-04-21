import { useEffect } from 'react';
import { Button, Tag, Space } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { purchaseOrdersApi } from '@api/tenant.api';

const statusColor = { DRAFT: 'default', CONFIRMED: 'blue', RECEIVED: 'green', CANCELLED: 'red' };

export default function PurchaseOrders() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(purchaseOrdersApi.list);
  const { execute: confirm } = useApi(purchaseOrdersApi.confirm, { onSuccess: fetch });
  const { execute: receive } = useApi(purchaseOrdersApi.receive, { onSuccess: fetch });

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Order #', dataIndex: 'orderNumber' },
    { title: 'Supplier', dataIndex: ['supplier', 'name'] },
    { title: 'Total', dataIndex: 'totalAmount', render: (v) => `$${v}` },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleDateString() },
    {
      title: 'Actions', render: (_, row) => (
        <Space size="small">
          {row.status === 'DRAFT' && <Button size="small" onClick={() => confirm(row.id)}>Confirm</Button>}
          {row.status === 'CONFIRMED' && <Button size="small" type="primary" onClick={() => receive(row.id)}>Receive</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Purchase Orders" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
