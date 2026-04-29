import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Descriptions, Divider, Popconfirm,
  Space, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { inventoryApi } from '@api/tenant.api';
import { printStockIssue } from '@shared/utils/printDocument';

const STATUS_COLORS = { DRAFT: 'orange', CONFIRMED: 'green', CANCELLED: 'default' };
const STATUS_LABELS = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' };
const ISSUE_TYPE_LABELS = { SALE: 'Xuất bán', INTERNAL: 'Xuất nội bộ', DAMAGED: 'Hỏng / Hủy' };

export default function StockIssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    inventoryApi.getIssue(id)
      .then((res) => setIssue(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const { execute: confirm, loading: confirming } = useApi(
    () => inventoryApi.confirmIssue(id),
    { successMessage: 'Xuất kho thành công', onSuccess: load },
  );

  const { execute: cancel, loading: cancelling } = useApi(
    () => inventoryApi.cancelIssue(id),
    { successMessage: 'Phiếu đã hủy', onSuccess: load },
  );

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!issue) return null;

  const isDraft = issue.status === 'DRAFT';
  const isConfirmed = issue.status === 'CONFIRMED';

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
            {truncated
              ? <Tooltip title={name}><span style={{ cursor: 'default' }}>{name.slice(0, 20)}…</span></Tooltip>
              : name}
          </span>
        );
      },
    },
    { title: 'Đơn vị', key: 'unit', width: 120, render: (_, row) => row.unitName ?? '—' },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 110,
      render: (v) => Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Đơn vị cơ bản',
      dataIndex: 'qtyInBase',
      key: 'qtyInBase',
      align: 'right',
      width: 120,
      render: (v) => Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Đơn giá TB',
      dataIndex: 'unitCost',
      key: 'unitCost',
      align: 'right',
      width: 130,
      render: (v) => v ? `${Number(v).toLocaleString('vi-VN')} ₫` : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/inventory/issues')} />
            Phiếu xuất kho
            <Tag color={STATUS_COLORS[issue.status]}>{STATUS_LABELS[issue.status] ?? issue.status}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => printStockIssue(issue)}>In phiếu</Button>
            {isDraft && (
              <>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/tenant/inventory/issues/${id}/edit`)}>
                  Chỉnh sửa
                </Button>
                <Button type="primary" icon={<CheckOutlined />} loading={confirming} onClick={confirm}>
                  Xác nhận xuất kho
                </Button>
              </>
            )}
            {(isDraft || isConfirmed) && (
              <Popconfirm
                title={isConfirmed ? 'Hủy phiếu sẽ hoàn lại tồn kho. Tiếp tục?' : 'Hủy phiếu này?'}
                onConfirm={cancel}
                okText="Hủy phiếu"
                cancelText="Không"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<CloseOutlined />} loading={cancelling}>Hủy phiếu</Button>
              </Popconfirm>
            )}
          </Space>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Kho xuất">{issue.warehouseName ?? issue.warehouseId}</Descriptions.Item>
          <Descriptions.Item label="Loại xuất">
            <Tag color={issue.issueType === 'DAMAGED' ? 'red' : issue.issueType === 'SALE' ? 'blue' : 'green'}>
              {ISSUE_TYPE_LABELS[issue.issueType] ?? issue.issueType}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Mã đơn hàng">{issue.orderId || '—'}</Descriptions.Item>
          {issue.confirmedAt && (
            <Descriptions.Item label="Xác nhận lúc">
              {dayjs(issue.confirmedAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Ghi chú">{issue.notes || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Table
          columns={itemColumns}
          dataSource={issue.items ?? []}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
}
