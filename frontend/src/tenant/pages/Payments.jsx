import { useEffect } from 'react';
import { Tag } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { paymentsApi } from '@api/tenant.api';

export default function Payments() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(paymentsApi.list);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber' },
    { title: 'Customer', dataIndex: ['customer', 'name'] },
    { title: 'Amount', dataIndex: 'totalAmount', render: (v) => `$${v}` },
    { title: 'Paid', dataIndex: 'paidAmount', render: (v) => `$${v}` },
    { title: 'Status', dataIndex: 'paymentStatus', render: (v) => <Tag color={v === 'PAID' ? 'green' : v === 'PARTIAL' ? 'orange' : 'default'}>{v}</Tag> },
    { title: 'Due Date', dataIndex: 'dueDate', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  return (
    <div>
      <PageHeader title="Invoices & Payments" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
