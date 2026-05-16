import { useEffect, useState, useCallback } from 'react';
import { Button, Tag, Space, Input, Select, Checkbox, Dropdown, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, MoreOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { productsApi, categoriesApi } from '@api/tenant.api';

const STAFF_ROLES = ['STAFF'];

function StockCell({ quantity, isLowStock }) {
  const { t } = useTranslation();
  if (Number(quantity) === 0) {
    return <Typography.Text type="danger">{t('products.outOfStock')}</Typography.Text>;
  }
  return (
    <Space size={4}>
      <span>{Number(quantity).toLocaleString()}</span>
      {isLowStock && <WarningOutlined style={{ color: '#faad14' }} />}
    </Space>
  );
}

function formatVND(v) {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('vi-VN')} ₫`;
}

export default function Products() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tenantUser } = useAuth();
  const isStaff = STAFF_ROLES.includes(tenantUser?.role);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(undefined);
  const [isActive, setIsActive] = useState(true);
  const [hasLowStock, setHasLowStock] = useState(false);
  const [categories, setCategories] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(productsApi.list);
  const { execute: toggleActive } = useApi(productsApi.toggleActive, { onSuccess: () => doFetch() });
  const { execute: remove } = useApi(productsApi.remove, { onSuccess: () => doFetch() });

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, categoryId, isActive, hasLowStock: hasLowStock || undefined });
  }, [fetch, search, categoryId, isActive, hasLowStock]);

  useEffect(() => { doFetch(); }, [isActive, categoryId, hasLowStock]);

  useEffect(() => {
    categoriesApi.flat().then((res) => {
      const cats = res.data?.data ?? res.data ?? [];
      setCategories(cats.map((c) => ({ label: c.name, value: c.id })));
    });
  }, []);

  const columns = [
    { title: t('products.sku'), dataIndex: 'sku', key: 'sku', width: 120 },
    { title: t('products.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('products.category'),
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (v) => v ?? '—',
    },
    { title: t('products.unit'), dataIndex: 'baseUnit', key: 'baseUnit', width: 80 },
    {
      title: t('products.retailPrice'),
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      width: 130,
      render: formatVND,
    },
    {
      title: t('products.stock'),
      key: 'stock',
      width: 110,
      render: (_, row) => <StockCell quantity={row.stockQuantity} isLowStock={row.isLowStock} />,
    },
    {
      title: t('common.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? t('products.active') : t('products.inactive')}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, row) => {
        const menuItems = [
          {
            key: 'edit',
            label: t('products.edit'),
            icon: <EditOutlined />,
            onClick: () => navigate(`/tenant/products/${row.id}/edit`),
          },
          ...(!isStaff
            ? [
                {
                  key: 'toggle',
                  label: row.isActive ? t('products.deactivate') : t('products.activate'),
                  onClick: () => toggleActive(row.id),
                },
              ]
            : []),
        ];
        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button icon={<MoreOutlined />} size="small" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('products.title')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/products/new')}
          >
            {t('products.addProduct')}
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('products.searchPlaceholder')}
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder={t('products.category')}
          options={categories}
          style={{ width: 180 }}
          allowClear
          value={categoryId}
          onChange={setCategoryId}
        />
        <Select
          value={isActive}
          style={{ width: 130 }}
          onChange={setIsActive}
          options={[
            { label: t('products.active'), value: true },
            { label: t('products.inactive'), value: false },
            { label: t('common.all'), value: undefined },
          ]}
        />
        <Checkbox checked={hasLowStock} onChange={(e) => setHasLowStock(e.target.checked)}>
          {t('products.lowStockFilter')}
        </Checkbox>
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
