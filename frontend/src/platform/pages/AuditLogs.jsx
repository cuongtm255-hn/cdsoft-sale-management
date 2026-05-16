import { useEffect } from 'react';
import { Tag } from 'antd';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { auditLogsApi } from '@api/platform.api';

export default function AuditLogs() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(auditLogsApi.list);
  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'User', dataIndex: 'username' },
    { title: 'Action', dataIndex: 'action', render: (v) => <Tag>{v}</Tag> },
    { title: 'Resource', dataIndex: 'resource' },
    { title: 'IP', dataIndex: 'ipAddress' },
    { title: 'Time', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
