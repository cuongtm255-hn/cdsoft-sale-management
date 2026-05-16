import { useEffect } from 'react';
import { Button, Tag, Space } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { tenantsApi } from '@api/platform.api';

const statusColor = { ACTIVE: 'green', INACTIVE: 'default', SUSPENDED: 'red' };

export default function TenantList() {
  const navigate = useNavigate();
  const { fetch, loading, data, pagination, onTableChange } = usePagination(tenantsApi.list);

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Code', dataIndex: 'tenantCode', key: 'tenantCode' },
    { title: 'Name', dataIndex: 'tenantName', key: 'tenantName' },
    { title: 'Company', dataIndex: 'companyName', key: 'companyName' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Provision', dataIndex: 'provisioningStatus', key: 'provisioningStatus', render: (v) => <Tag>{v}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_, row) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/platform/tenants/${row.id}`)}>View</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tenants"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/platform/tenants/new')}>New Tenant</Button>}
      />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />
    </div>
  );
}
