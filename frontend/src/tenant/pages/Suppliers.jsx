import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Select, Space, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { suppliersApi } from '@api/tenant.api';

function DebtCell({ currentDebt }) {
  const { t } = useTranslation();
  const debt = Number(currentDebt);
  if (debt === 0) return <Typography.Text type="secondary">{t('suppliers.noDebt')}</Typography.Text>;
  return (
    <Typography.Text style={{ color: '#cf1322', fontWeight: 500 }}>
      {debt.toLocaleString('vi-VN')} ₫
    </Typography.Text>
  );
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState(undefined);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(suppliersApi.list);

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, isActive });
  }, [fetch, search, isActive]);

  useEffect(() => { doFetch(); }, [isActive]);

  const statusOptions = [
    { label: t('suppliers.statusAll'), value: undefined },
    { label: t('suppliers.statusActive'), value: true },
    { label: t('suppliers.statusInactive'), value: false },
  ];

  const columns = [
    { title: t('suppliers.code'), dataIndex: 'code', key: 'code', width: 110 },
    {
      title: t('suppliers.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Space size={4}>
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 500 }}
            onClick={() => navigate(`/tenant/suppliers/${row.id}`)}
          >
            {name}
          </Button>
          {row.isCustomer && (
            <Tooltip title={t('suppliers.isCustomer')}>
              <span style={{ fontSize: 14 }}>🔄</span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: t('suppliers.taxCode'), dataIndex: 'taxCode', key: 'taxCode', width: 130, render: (v) => v || '—' },
    {
      title: t('suppliers.payables'),
      key: 'debt',
      width: 150,
      render: (_, row) => <DebtCell currentDebt={row.currentDebt} />,
    },
    {
      title: t('suppliers.paymentTerm'),
      dataIndex: 'paymentTermDays',
      key: 'paymentTermDays',
      width: 100,
      render: (v) => t('suppliers.paymentTermDays', { days: v ?? 0 }),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Button size="small" onClick={() => navigate(`/tenant/suppliers/${row.id}/edit`)}>
          {t('suppliers.edit')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('suppliers.title')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/suppliers/new')}
          >
            {t('suppliers.addSupplier')}
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('suppliers.searchPlaceholder')}
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          options={statusOptions}
          style={{ width: 180 }}
          value={isActive}
          onChange={setIsActive}
          placeholder={t('common.status')}
        />
      </Space>

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
      />
    </div>
  );
}
