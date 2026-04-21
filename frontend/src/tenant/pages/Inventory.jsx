import { useEffect } from 'react';
import { Tag } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { inventoryApi } from '@api/tenant.api';

const typeColor = { STOCK_IN: 'green', STOCK_OUT: 'orange', ADJUSTMENT: 'blue' };

export default function Inventory() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(inventoryApi.transactions);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Product', dataIndex: ['product', 'name'] },
    { title: 'SKU', dataIndex: ['product', 'sku'] },
    { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]}>{v}</Tag> },
    { title: 'Qty', dataIndex: 'quantity' },
    { title: 'Note', dataIndex: 'note' },
    { title: 'Date', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader title="Inventory Transactions" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
