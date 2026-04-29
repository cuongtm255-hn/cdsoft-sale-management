import { Table, InputNumber, Select, Button, Tooltip, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

export default function OrderItemsTable({ items = [], editable = false, onChange, unitOptions = {} }) {
  const handleChange = (index, field, value) => {
    if (!onChange) return;
    const next = items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      const qty = field === 'quantity' ? value : updated.quantity ?? 0;
      const price = field === 'unitPrice' ? value : updated.unitPrice ?? 0;
      const pct = field === 'discountPercent' ? value : updated.discountPercent ?? 0;
      const discAmt = field === 'discountAmount' ? value : updated.discountAmount ?? 0;
      updated.lineTotal = price * qty * (1 - pct / 100) - discAmt;
      return updated;
    });
    onChange(next);
  };

  const handleRemove = (index) => {
    onChange?.(items.filter((_, i) => i !== index));
  };

  const columns = [
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_, row) => {
        const name = row.productName ?? '';
        const truncated = name.length > 20;
        return (
          <span>
            <Typography.Text code>{row.productSku ?? row.productId}</Typography.Text>{' '}
            {truncated ? (
              <Tooltip title={name}>
                <span style={{ cursor: 'default' }}>{name.slice(0, 20)}…</span>
              </Tooltip>
            ) : name}
          </span>
        );
      },
    },
    {
      title: 'ĐVT',
      dataIndex: 'unitId',
      key: 'unit',
      width: 100,
      render: (v, row, i) => {
        const opts = unitOptions[row.productId] ?? [];
        if (!editable || !opts.length) return row.unitName ?? v ?? '—';
        return (
          <Select
            size="small"
            value={v}
            options={opts}
            style={{ width: 90 }}
            onChange={(val) => handleChange(i, 'unitId', val)}
          />
        );
      },
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (v, _, i) =>
        editable ? (
          <InputNumber
            size="small"
            min={0.0001}
            value={v}
            style={{ width: 80 }}
            onChange={(val) => handleChange(i, 'quantity', val)}
          />
        ) : v,
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 130,
      render: (v, row, i) =>
        editable ? (
          <InputNumber
            size="small"
            min={0}
            value={v}
            style={{ width: 110 }}
            formatter={(val) => val?.toLocaleString('vi-VN')}
            onChange={(val) => handleChange(i, 'unitPrice', val)}
          />
        ) : (
          <Typography.Text style={row._priceOverride ? { color: '#d46b08' } : {}}>
            {fmt(v)}
          </Typography.Text>
        ),
    },
    {
      title: 'CK%',
      dataIndex: 'discountPercent',
      key: 'disc',
      width: 80,
      render: (v, _, i) =>
        editable ? (
          <InputNumber
            size="small"
            min={0}
            max={100}
            value={v ?? 0}
            style={{ width: 65 }}
            onChange={(val) => handleChange(i, 'discountPercent', val)}
          />
        ) : (v ? `${v}%` : '—'),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'lineTotal',
      key: 'lineTotal',
      width: 130,
      render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text>,
    },
  ];

  if (editable) {
    columns.push({
      title: '',
      key: 'del',
      width: 40,
      render: (_, __, i) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemove(i)}
        />
      ),
    });
  }

  return (
    <Table
      rowKey={(_, i) => i}
      columns={columns}
      dataSource={items}
      pagination={false}
      size="small"
      bordered
    />
  );
}
