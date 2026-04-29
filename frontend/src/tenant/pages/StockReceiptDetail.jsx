import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Descriptions, Divider, Popconfirm, Row,
  Space, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi } from '@api/tenant.api';
import { printStockReceipt } from '@shared/utils/printDocument';

const STATUS_COLORS = { DRAFT: 'orange', CONFIRMED: 'green', CANCELLED: 'default' };
const STATUS_LABELS = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' };

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

export default function StockReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    inventoryApi.getReceipt(id)
      .then((res) => setReceipt(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const { execute: confirm, loading: confirming } = useApi(
    () => inventoryApi.confirmReceipt(id, {}),
    {
      successMessage: 'Nhập kho thành công',
      onSuccess: load,
    },
  );

  const { execute: cancel, loading: cancelling } = useApi(
    () => inventoryApi.cancelReceipt(id),
    {
      successMessage: 'Phiếu đã hủy',
      onSuccess: load,
    },
  );

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!receipt) return null;

  const isDraft = receipt.status === 'DRAFT';

  const itemColumns = [
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
      title: 'Đơn vị',
      key: 'unit',
      width: 120,
      render: (_, row) => row.unitName ?? '—',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      render: (v) => Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitCost',
      key: 'unitCost',
      align: 'right',
      render: (v) => fmtVND(v),
    },
    {
      title: 'Thành tiền',
      key: 'lineTotal',
      align: 'right',
      render: (_, row) => (
        <Typography.Text style={{ fontWeight: 500 }}>
          {fmtVND(Number(row.quantity) * Number(row.unitCost))}
        </Typography.Text>
      ),
    },
    { title: 'Số lô', dataIndex: 'batchNumber', key: 'batchNumber', render: (v) => v || '—' },
    {
      title: 'HSD',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory/receipts')} />
            Phiếu nhập kho
            <Tag color={STATUS_COLORS[receipt.status]}>{STATUS_LABELS[receipt.status] ?? receipt.status}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => printStockReceipt(receipt)}>In phiếu</Button>
            {isDraft && (
              <>
              <Button icon={<EditOutlined />} onClick={() => navigate(`/tenant/inventory/receipts/${id}/edit`)}>
                Chỉnh sửa
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={confirming}
                onClick={confirm}
              >
                Xác nhận nhập kho
              </Button>
              <Popconfirm
                title="Hủy phiếu nhập này?"
                onConfirm={cancel}
                okText="Hủy phiếu"
                cancelText="Không"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<CloseOutlined />} loading={cancelling}>
                  Hủy phiếu
                </Button>
              </Popconfirm>
              </>
            )}
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Mã tham chiếu">{receipt.refCode || '—'}</Descriptions.Item>
          <Descriptions.Item label="Nhà cung cấp">
            {receipt.supplierCode
              ? <span>
                  <Typography.Text code>{receipt.supplierCode}</Typography.Text>
                  {' '}{receipt.supplierName}
                </span>
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Kho nhập">{receipt.warehouseName ?? receipt.warehouseId}</Descriptions.Item>
          <Descriptions.Item label="Ngày dự kiến">
            {receipt.expectedDate ? dayjs(receipt.expectedDate).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          {receipt.confirmedAt && (
            <Descriptions.Item label="Xác nhận lúc">
              {dayjs(receipt.confirmedAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Ghi chú">{receipt.notes || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Table
          columns={itemColumns}
          dataSource={receipt.items ?? []}
          rowKey="id"
          size="small"
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={4} align="right">
                <strong>Tổng cộng:</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right">
                <Typography.Text style={{ color: '#1890ff', fontWeight: 600 }}>
                  {fmtVND(receipt.totalAmount)}
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell colSpan={2} />
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
}
