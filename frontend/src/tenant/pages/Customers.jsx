import { useEffect, useState, useCallback } from 'react';
import { Button, Tag, Space, Input, Select, Typography, Tooltip } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { customersApi } from '@api/tenant.api';

const GROUP_COLORS = { RETAIL: 'default', WHOLESALE: 'blue', AGENT: 'purple', VIP: 'gold' };
const TIER_ICONS = { NONE: '—', SILVER: '🥈', GOLD: '🥇', DIAMOND: '💎' };

function GroupBadge({ group }) {
  const { t } = useTranslation();
  const labels = {
    RETAIL: t('customers.groupRetail'),
    WHOLESALE: t('customers.groupWholesale'),
    AGENT: t('customers.groupAgent'),
    VIP: t('customers.groupVip'),
  };
  return <Tag color={GROUP_COLORS[group]}>{labels[group] ?? group}</Tag>;
}

function DebtCell({ currentDebt, creditLimit }) {
  const { t } = useTranslation();
  const debt = Number(currentDebt);
  const limit = Number(creditLimit);
  const overLimit = limit > 0 && debt >= limit;

  if (debt === 0) {
    return <Typography.Text type="secondary">{t('customers.noDebt')}</Typography.Text>;
  }

  const cell = (
    <Typography.Text style={{ color: overLimit ? '#cf1322' : '#d46b08', fontWeight: 500 }}>
      {debt.toLocaleString('vi-VN')} ₫
    </Typography.Text>
  );

  return overLimit ? (
    <Tooltip title={t('customers.creditLimitReached')}>{cell}</Tooltip>
  ) : cell;
}

function TierCell({ memberTier, loyaltyPoints }) {
  return (
    <Space size={4}>
      <span>{TIER_ICONS[memberTier] ?? '—'}</span>
      <Typography.Text>{Number(loyaltyPoints).toLocaleString()}</Typography.Text>
    </Space>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tenantUser } = useAuth();
  const canFilterSalesRep = ['MANAGER', 'TENANT_ADMIN'].includes(tenantUser?.role);

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(undefined);
  const [isActive] = useState(true);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(customersApi.list);

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, group, isActive });
  }, [fetch, search, group, isActive]);

  useEffect(() => { doFetch(); }, [group, isActive]);

  const columns = [
    { title: t('customers.code'), dataIndex: 'code', key: 'code', width: 110 },
    {
      title: t('customers.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 500 }}
          onClick={() => navigate(`/tenant/customers/${row.id}`)}
        >
          {name}
        </Button>
      ),
    },
    {
      title: t('customers.group'),
      dataIndex: 'customerGroup',
      key: 'group',
      width: 100,
      render: (v) => <GroupBadge group={v} />,
    },
    {
      title: t('customers.currentDebt'),
      key: 'debt',
      width: 150,
      render: (_, row) => <DebtCell currentDebt={row.currentDebt} creditLimit={row.creditLimit} />,
    },
    {
      title: t('customers.loyaltyPoints'),
      key: 'loyalty',
      width: 130,
      render: (_, row) => <TierCell memberTier={row.memberTier} loyaltyPoints={row.loyaltyPoints} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, row) => (
        <Button
          size="small"
          onClick={() => navigate(`/tenant/customers/${row.id}/edit`)}
        >
          {t('customers.edit')}
        </Button>
      ),
    },
  ];

  const groupOptions = [
    { label: t('customers.allGroups'), value: undefined },
    { label: t('customers.groupRetail'), value: 'RETAIL' },
    { label: t('customers.groupWholesale'), value: 'WHOLESALE' },
    { label: t('customers.groupAgent'), value: 'AGENT' },
    { label: t('customers.groupVip'), value: 'VIP' },
  ];

  return (
    <div>
      <PageHeader
        title={t('customers.title')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/customers/new')}
          >
            {t('customers.addCustomer')}
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('customers.searchPlaceholder')}
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder={t('customers.groupFilter')}
          options={groupOptions}
          style={{ width: 160 }}
          value={group}
          onChange={setGroup}
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
