import { useEffect, useState, useCallback } from 'react';
import { Button, Tag, Space, Input, Select, Checkbox, Dropdown, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, MoreOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { productsApi, categoriesApi } from '@api/tenant.api';

const STAFF_ROLES = ['STAFF'];

function StockCell({ quantity, isLowStock }) {
  if (Number(quantity) === 0) {
    return <Typography.Text type="danger">Hết hàng</Typography.Text>;
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
  const { tenantUser } = useAuth();
  const isStaff = STAFF_ROLES.includes(tenantUser?.role);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(undefined);
  const [isActive, setIsActive] = useState(true);
  const [hasLowStock, setHasLowStock] = useState(false);
  const [categories, setCategories] = useState([]);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(productsApi.list);
  const { execute: toggleActive } = useApi(productsApi.toggleActive, { onSuccess: () => doFetch() });
  const { execute: remove } = useApi(productsApi.remove, { successMessage: 'Product deleted', onSuccess: () => doFetch() });

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
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
    {
      title: 'Danh mục',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (v) => v ?? '—',
    },
    { title: 'Đơn vị', dataIndex: 'baseUnit', key: 'baseUnit', width: 80 },
    {
      title: 'Giá bán lẻ',
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      width: 130,
      render: formatVND,
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      width: 110,
      render: (_, row) => <StockCell quantity={row.stockQuantity} isLowStock={row.isLowStock} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Đang bán' : 'Ngừng bán'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, row) => {
        const menuItems = [
          {
            key: 'edit',
            label: 'Chỉnh sửa',
            icon: <EditOutlined />,
            onClick: () => navigate(`/tenant/products/${row.id}/edit`),
          },
          ...(!isStaff
            ? [
                {
                  key: 'toggle',
                  label: row.isActive ? 'Ngừng bán' : 'Kích hoạt',
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
        title="Sản phẩm"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/tenant/products/new')}
          >
            Thêm sản phẩm
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm SKU / Tên / Barcode"
          style={{ width: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder="Danh mục"
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
            { label: 'Đang bán', value: true },
            { label: 'Ngừng bán', value: false },
            { label: 'Tất cả', value: undefined },
          ]}
        />
        <Checkbox checked={hasLowStock} onChange={(e) => setHasLowStock(e.target.checked)}>
          Sắp hết hàng
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
