import { useCallback, useEffect, useState } from 'react';
import {
  Button, Checkbox, Col, Dropdown, Input, Menu, Row, Select, Space,
  Tooltip, Typography,
} from 'antd';
import {
  PlusOutlined, WarningOutlined, DownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { inventoryApi, warehousesApi } from '@api/tenant.api';

const CAN_SEE_COST = ['MANAGER', 'TENANT_ADMIN', 'ACCOUNTANT'];

export default function Inventory() {
  const navigate = useNavigate();
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
    { key: 'stock-in', label: 'Nhập kho', onClick: () => navigate('/tenant/inventory/receipts/new') },
    { key: 'stock-out', label: 'Xuất kho', onClick: () => navigate('/tenant/inventory/issues/new') },
    { key: 'adjust', label: 'Điều chỉnh kho', onClick: () => navigate('/tenant/inventory/adjustments/new') },
    { key: 'transfer', label: 'Điều chuyển kho', onClick: () => navigate('/tenant/inventory/transfers/new') },
    { key: 'stocktaking', label: 'Kiểm kê kho', onClick: () => navigate('/tenant/inventory/stocktaking') },
  ];

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    {
      title: 'Tên sản phẩm',
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
    { title: 'Kho', dataIndex: 'warehouseName', key: 'warehouseName', width: 140 },
    {
      title: 'Tồn kho',
      key: 'stock',
      width: 130,
      render: (_, row) => (
        <Space size={4}>
          <Typography.Text style={{ fontWeight: 500 }}>
            {Number(row.quantity).toLocaleString('vi-VN')}
          </Typography.Text>
          {row.isLowStock && (
            <Tooltip title={`Dưới định mức tối thiểu ${Number(row.minStockLevel).toLocaleString()} sản phẩm`}>
              <WarningOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    canSeeCost && {
      title: 'Giá trị kho',
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
        title="Tồn kho"
        extra={
          <Dropdown menu={{ items: addMenuItems }}>
            <Button type="primary" icon={<PlusOutlined />}>
              Thao tác <DownOutlined />
            </Button>
          </Dropdown>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm SKU / Tên sản phẩm"
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
          placeholder="Tất cả kho"
          allowClear
        />
        <Checkbox checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)}>
          Chỉ hàng sắp hết
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
