import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Space, Descriptions, Divider, Table, Tooltip, Typography, Spin, Tag,
} from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import InvoiceStatusBadge from '@shared/components/InvoiceStatusBadge';
import OrderSummaryPanel from '@shared/components/OrderSummaryPanel';
import PaymentModal from '@shared/components/PaymentModal';
import { invoicesApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const METHOD_LABELS = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  E_WALLET: 'Ví điện tử',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.get(id);
      setInvoice(res.data?.data ?? res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <Spin style={{ margin: 40 }} />;
  if (!invoice) return <Typography.Text type="danger">Không tìm thấy hoá đơn</Typography.Text>;

  const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount);
  const isPaid = invoice.status === 'PAID';

  const itemColumns = [
    { title: '#', key: 'idx', width: 40, render: (_, __, i) => i + 1 },
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_, row) => {
        const name = row.productName ?? '';
        const truncated = name.length > 20;
        return (
          <span>
            {row.productSku && <Typography.Text code>{row.productSku}</Typography.Text>}{' '}
            {truncated
              ? <Tooltip title={name}><span style={{ cursor: 'default' }}>{name.slice(0, 20)}…</span></Tooltip>
              : name}
          </span>
        );
      },
    },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'SL', dataIndex: 'quantity', key: 'qty', width: 80 },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'price', width: 120, render: (v) => fmt(v) },
    {
      title: 'CK', dataIndex: 'discountPercent', key: 'disc', width: 70,
      render: (v) => v ? `${v}%` : '—',
    },
    { title: 'Thành tiền', dataIndex: 'lineTotal', key: 'total', width: 130, render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text> },
  ];

  const paymentColumns = [
    {
      title: 'Ngày', dataIndex: 'paidAt', key: 'date', width: 130,
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Phương thức', dataIndex: 'method', key: 'method', width: 130,
      render: (v) => METHOD_LABELS[v] ?? v,
    },
    { title: 'Mã GD', dataIndex: 'transactionRef', key: 'ref', render: (v) => v ?? '—' },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', width: 130, render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text> },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (v) => v ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tenant/payments')} />
            {invoice.code}
            <InvoiceStatusBadge status={invoice.status} />
          </Space>
        }
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>In PDF</Button>
            <Button icon={<DownloadOutlined />} href={`/api/tenant/invoices/${id}/pdf`} target="_blank">
              Xuất PDF
            </Button>
            {!isPaid && (
              <Button type="primary" onClick={() => setPayModal(true)}>Thu tiền</Button>
            )}
          </Space>
        }
      />

      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Mã đơn hàng">{invoice.orderCode ?? invoice.orderId}</Descriptions.Item>
        <Descriptions.Item label="Ngày phát hành">{dayjs(invoice.issuedAt).format('DD/MM/YYYY')}</Descriptions.Item>
        <Descriptions.Item label="Khách hàng">
          {invoice.customer?.code
            ? <Tooltip title={invoice.customer.name}><Typography.Text code>{invoice.customer.code}</Typography.Text></Tooltip>
            : '—'}
          {invoice.customer?.name && <span style={{ marginLeft: 6 }}>{invoice.customer.name}</span>}
          {invoice.customer?.taxCode && <div style={{ fontSize: 12, color: '#888' }}>MST: {invoice.customer.taxCode}</div>}
        </Descriptions.Item>
        <Descriptions.Item label="Hạn thanh toán">
          {invoice.dueDate ? dayjs(invoice.dueDate).format('DD/MM/YYYY') : '—'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Sản phẩm</Divider>
      <Table
        rowKey={(_, i) => i}
        columns={itemColumns}
        dataSource={invoice.items ?? []}
        pagination={false}
        size="small"
        bordered
      />

      <Divider />
      <OrderSummaryPanel
        subtotal={invoice.subtotal}
        discountTotal={invoice.discountTotal}
        totalAmount={invoice.totalAmount}
      />
      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <Typography.Text>Đã thanh toán: <strong>{fmt(invoice.paidAmount)}</strong></Typography.Text>
        <br />
        <Typography.Text type={remaining > 0 ? 'danger' : 'success'}>
          Còn lại: <strong>{fmt(remaining)}</strong>
        </Typography.Text>
      </div>

      {(invoice.payments ?? []).length > 0 && (
        <>
          <Divider orientation="left">Lịch sử thanh toán</Divider>
          <Table
            rowKey="id"
            columns={paymentColumns}
            dataSource={invoice.payments}
            pagination={false}
            size="small"
          />
        </>
      )}

      <PaymentModal
        open={payModal}
        invoice={invoice}
        onClose={() => setPayModal(false)}
        onPaid={load}
      />
    </div>
  );
}
