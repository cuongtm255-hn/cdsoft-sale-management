import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Space, Tag } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const STATUS_COLORS = { DRAFT: 'orange', CONFIRMED: 'green', CANCELLED: 'default' };
const ISSUE_TYPE_COLORS = { SALE: 'blue', INTERNAL: 'green', DAMAGED: 'red' };

export default function StockIssuesList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [warehouseId, setWarehouseId] = useState(undefined);
  const [warehouses, setWarehouses] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(
    (params) => inventoryApi.getIssues(params),
  );

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
  }, []);

  const doFetch = useCallback(() => { fetch({ warehouseId }); }, [fetch, warehouseId]);
  useEffect(() => { doFetch(); }, [warehouseId]);

  const statusLabels = {
    DRAFT: t('status.draft'),
    CONFIRMED: t('status.confirmed'),
    CANCELLED: t('status.cancelled'),
  };

  const issueTypeLabels = {
    SALE: t('inventory.issueTypeSale'),
    INTERNAL: t('inventory.issueTypeInternal'),
    DAMAGED: t('inventory.issueTypeDamaged'),
  };

  const columns = [
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v) => <Tag color={STATUS_COLORS[v]}>{statusLabels[v] ?? v}</Tag>,
    },
    {
      title: t('inventoryPage.warehouseOut'),
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 140,
    },
    {
      title: t('inventoryPage.issueTypeLabel'),
      dataIndex: 'issueType',
      key: 'issueType',
      width: 130,
      render: (v) => <Tag color={ISSUE_TYPE_COLORS[v] ?? 'default'}>{issueTypeLabels[v] ?? v ?? '—'}</Tag>,
    },
    {
      title: t('inventoryPage.orderRef'),
      dataIndex: 'orderCode',
      key: 'orderCode',
      width: 150,
      render: (v) => v || '—',
    },
    {
      title: t('common.note'),
      dataIndex: 'notes',
      key: 'notes',
      render: (v) => v || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, row) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/tenant/inventory/issues/${row.id}`)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('inventory.issues')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tenant/inventory/issues/new')}>
            {t('inventoryPage.newIssue')}
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }}>
        <Select
          options={warehouses}
          style={{ width: 200 }}
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder={t('inventoryPage.warehouseAll')}
          allowClear
        />
      </Space>

      <DataTable
        columns={columns}
        dataSource={Array.isArray(data) ? data : data?.data ?? []}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        rowKey="id"
      />
    </div>
  );
}
