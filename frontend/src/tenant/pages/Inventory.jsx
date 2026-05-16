import { useCallback, useEffect, useState } from 'react';
import {
  Button, Checkbox, Col, Dropdown, Input, Menu, Row, Select, Space,
  Tooltip, Typography,
} from 'antd';
import {
  PlusOutlined, WarningOutlined, DownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const CAN_SEE_COST = ['MANAGER', 'TENANT_ADMIN', 'ACCOUNTANT'];

export default function Inventory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tenantUser } = useAuth();
  const canSeeCost = CAN_SEE_COST.includes(tenantUser?.role);

  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(inventoryApi.transactions);

  useEffect(() => {
    warehousesApi.list().then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setWarehouses(list.map((w) => ({ label: w.name, value: w.id })));
    });
  }, []);

  const doFetch = useCallback(() => {
    fetch({ search: search || undefined, warehouseId, lowStockOnly: lowStockOnly || undefined });
  }, [fetch, search, warehouseId, lowStockOnly]);

  useEffect(() => { doFetch(); }, [warehouseId, lowStockOnly]);

  const addMenuItems = [
    { key: 'stock-in', label: t('inventoryPage.stockIn'), onClick: () => navigate('/tenant/inventory/receipts/new') },
    { key: 'stock-out', label: t('inventoryPage.stockOut'), onClick: () => navigate('/tenant/inventory/issues/new') },
    { key: 'adjust', label: t('inventoryPage.adjust'), onClick: () => navigate('/tenant/inventory/adjustments/new') },
    { key: 'transfer', label: t('inventoryPage.transfer'), onClick: () => navigate('/tenant/inventory/transfers/new') },
    { key: 'stocktaking', label: t('inventoryPage.stocktakingAction'), onClick: () => navigate('/tenant/inventory/stocktaking') },
  ];

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    {
      title: t('inventoryPage.productName'),
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => navigate(`/tenant/inventory/transactions?productId=${row.productId}`)}
        >
          {name}
        </Button>
      ),
    },
    { title: t('common.warehouse'), dataIndex: 'warehouseName', key: 'warehouseName', width: 140 },
    {
      title: t('inventory.stockAvailable'),
      key: 'stock',
      width: 130,
      render: (_, row) => (
        <Space size={4}>
          <Typography.Text style={{ fontWeight: 500 }}>
            {Number(row.quantity).toLocaleString('vi-VN')}
          </Typography.Text>
          {row.isLowStock && (
            <Tooltip title={`${t('products.lowStockFilter')} ≤ ${Number(row.minStockLevel).toLocaleString()}`}>
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    canSeeCost && {
      title: t('inventoryPage.stockValue'),
      key: 'totalValue',
      width: 150,
      align: 'right',
      render: (_, row) => (
        <Typography.Text>
          {Number(row.totalValue ?? 0).toLocaleString('vi-VN')} ₫
        </Typography.Text>
      ),
    },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={t('inventoryPage.stockBalance')}
        extra={
          <Dropdown menu={{ items: addMenuItems }}>
            <Button type="primary" icon={<PlusOutlined />}>
              {t('inventoryPage.actions')} <DownOutlined />
            </Button>
          </Dropdown>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder={t('inventoryPage.productSearch')}
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          options={warehouses}
          style={{ width: 180 }}
          value={warehouseId}
          onChange={setWarehouseId}
          placeholder={t('inventoryPage.warehouseAll')}
          allowClear
        />
        <Checkbox checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)}>
          {t('inventoryPage.lowStockOnly')}
        </Checkbox>
      </Space>

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        rowKey={(r) => `${r.productId}_${r.warehouseId}`}
      />
    </div>
  );
}
