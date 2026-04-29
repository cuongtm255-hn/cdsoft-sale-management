import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Descriptions, Divider, Popconfirm, Space,
  Spin, Table, Tag, Typography, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, PrinterOutlined, SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi } from '@api/tenant.api';
import { printStockTransfer } from '@shared/utils/printDocument';

const STATUS_COLORS = {
  PENDING: 'blue',
  IN_TRANSIT: 'orange',
  RECEIVED: 'green',
  CANCELLED: 'default',
};
const STATUS_LABELS = {
  PENDING: 'Chờ xuất kho',
  IN_TRANSIT: 'Đang vận chuyển',
  RECEIVED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    inventoryApi.getTransfer(id)
      .then((res) => setTransfer(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const { execute: dispatch, loading: dispatching } = useApi(
    () => inventoryApi.dispatchTransfer(id),
    {
      successMessage: 'Đã xuất kho — hàng đang trên đường vận chuyển',
      onSuccess: load,
    },
  );

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!transfer) return null;

  const isPending = transfer.status === 'PENDING';
  const isInTransit = transfer.status === 'IN_TRANSIT';

  const itemColumns = [
    {
      title: 'Sản phẩm',
      key: 'productId',
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
    { title: 'Đơn vị', key: 'unitId', render: (_, row) => row.unitName || row.unitId || '—' },
    {
      title: 'SL điều chuyển',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (v) => Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'SL thực nhận',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      align: 'right',
      render: (v) => v != null ? Number(v).toLocaleString('vi-VN') : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => navigate('/tenant/inventory/transfers')}
            />
            Lệnh điều chuyển kho
            <Tag color={STATUS_COLORS[transfer.status]}>
              {STATUS_LABELS[transfer.status] ?? transfer.status}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => printStockTransfer(transfer)}>In phiếu</Button>
            {isPending && (
              <Popconfirm
                title="Xác nhận xuất kho để bắt đầu vận chuyển?"
                onConfirm={dispatch}
                okText="Xuất kho"
                cancelText="Không"
              >
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={dispatching}
                >
                  Xuất kho (Dispatch)
                </Button>
              </Popconfirm>
            )}
            {isInTransit && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => navigate(`/tenant/inventory/transfers/${id}/receive`)}
              >
                Xác nhận nhận hàng
              </Button>
            )}
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Kho đi">{transfer.fromWarehouseName || transfer.fromWarehouseId}</Descriptions.Item>
          <Descriptions.Item label="Kho đến">{transfer.toWarehouseName || transfer.toWarehouseId}</Descriptions.Item>
          <Descriptions.Item label="Ngày dự kiến">
            {transfer.expectedDate ? dayjs(transfer.expectedDate).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          {transfer.dispatchedAt && (
            <Descriptions.Item label="Xuất kho lúc">
              {dayjs(transfer.dispatchedAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          )}
          {transfer.receivedAt && (
            <Descriptions.Item label="Nhận hàng lúc">
              {dayjs(transfer.receivedAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Ghi chú">{transfer.notes || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Danh sách hàng điều chuyển">
        <Table
          columns={itemColumns}
          dataSource={transfer.items ?? []}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
}
