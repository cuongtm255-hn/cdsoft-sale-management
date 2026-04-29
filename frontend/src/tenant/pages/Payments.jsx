import { useEffect, useState, useCallback } from 'react';
import {
  Button, Space, Input, Select, DatePicker, Typography,
  Modal, Form, InputNumber, Descriptions, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import InvoiceStatusBadge from '@shared/components/InvoiceStatusBadge';
import PaymentModal from '@shared/components/PaymentModal';
import { usePagination } from '@shared/hooks/useApi';
import { invoicesApi, paymentsApi, cashApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const METHOD_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
  { label: 'Thẻ', value: 'CARD' },
  { label: 'Ví điện tử', value: 'E_WALLET' },
];

function NewPaymentModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const method = Form.useWatch('method', form);

  const loadInvoices = (search = '') => {
    invoicesApi.list({ status: 'UNPAID', search: search || undefined, limit: 50 })
      .then((res) => {
        const list = res.data?.data?.data ?? res.data?.data ?? [];
        const map = {};
        list.forEach((inv) => { map[inv.id] = inv; });
        setInvoiceMap((prev) => ({ ...prev, ...map }));
        setInvoiceOptions(list.map((inv) => ({
          label: `${inv.code} — ${inv.customer_name ?? inv.customerId ?? ''}`,
          value: inv.id,
        })));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (open) {
      loadInvoices();
      cashApi.listBankAccounts()
        .then((r) => {
          setBankAccounts((r.data?.data ?? r.data ?? []).map((a) => ({
            label: `${a.bankName} — ${a.accountNumber}`,
            value: a.id,
          })));
        })
        .catch(() => {});
      form.resetFields();
      form.setFieldsValue({ method: 'CASH', paidAt: dayjs() });
      setSelectedInvoice(null);
    }
  }, [open]);

  const handleInvoiceSelect = (id) => {
    const inv = invoiceMap[id];
    setSelectedInvoice(inv ?? null);
    if (inv) {
      const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
      form.setFieldValue('amount', remaining);
    }
  };

  const handleOk = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setLoading(true);
    try {
      await paymentsApi.record({
        invoiceId: values.invoiceId,
        amount: values.amount,
        method: values.method,
        bankAccountId: values.bankAccountId,
        transactionRef: values.transactionRef,
        paidAt: values.paidAt?.toISOString(),
        notes: values.notes,
      });
      message.success('Ghi nhận thanh toán thành công');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (msg === 'INVOICE_ALREADY_PAID') message.error('Hoá đơn đã thanh toán đủ');
      else if (msg === 'AMOUNT_EXCEEDS_REMAINING') message.error('Vượt số tiền còn lại');
      else message.error('Ghi nhận thanh toán thất bại');
    } finally {
      setLoading(false);
    }
  };

  const remaining = selectedInvoice
    ? Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)
    : 0;

  return (
    <Modal
      title="Tạo thanh toán mới"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Xác nhận thu tiền"
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="invoiceId" label="Hoá đơn" rules={[{ required: true, message: 'Chọn hoá đơn' }]}>
          <Select
            showSearch
            placeholder="Tìm mã hoá đơn hoặc khách hàng..."
            options={invoiceOptions}
            onSearch={loadInvoices}
            filterOption={false}
            onChange={handleInvoiceSelect}
          />
        </Form.Item>

        {selectedInvoice && (
          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Tổng tiền">{fmt(selectedInvoice.totalAmount)}</Descriptions.Item>
            <Descriptions.Item label="Đã TT">{fmt(selectedInvoice.paidAmount)}</Descriptions.Item>
            <Descriptions.Item label={<Typography.Text type="danger">Còn lại</Typography.Text>}>
              <Typography.Text type="danger" strong>{fmt(remaining)}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Hạn TT">
              {selectedInvoice.dueDate ? dayjs(selectedInvoice.dueDate).format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}

        <Form.Item
          name="amount"
          label="Số tiền"
          rules={[
            { required: true, message: 'Nhập số tiền' },
            { type: 'number', min: 0.01, message: 'Số tiền phải > 0' },
            ...(remaining > 0 ? [{ type: 'number', max: remaining + 0.01, message: `Không được vượt ${fmt(remaining)}` }] : []),
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.01}
            formatter={(v) => v?.toLocaleString?.('vi-VN') ?? v}
            addonAfter="₫"
            disabled={!selectedInvoice}
          />
        </Form.Item>

        <Form.Item name="method" label="Phương thức" rules={[{ required: true }]}>
          <Select options={METHOD_OPTIONS} />
        </Form.Item>

        {method === 'BANK_TRANSFER' && (
          <>
            <Form.Item name="bankAccountId" label="Tài khoản ngân hàng">
              <Select options={bankAccounts} placeholder="Chọn tài khoản" allowClear />
            </Form.Item>
            <Form.Item name="transactionRef" label="Mã giao dịch">
              <Input placeholder="FT-123456" />
            </Form.Item>
          </>
        )}

        <Form.Item name="paidAt" label="Ngày thanh toán" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(d) => d && d.isAfter(dayjs(), 'day')} />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

const STATUS_OPTIONS = [
  { label: 'Tất cả', value: undefined },
  { label: 'Chưa thanh toán', value: 'UNPAID' },
  { label: 'Thanh toán 1 phần', value: 'PARTIALLY_PAID' },
  { label: 'Đã thanh toán', value: 'PAID' },
];

export default function Payments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [newPayOpen, setNewPayOpen] = useState(false);

  const { fetch, loading, data, pagination, onTableChange } = usePagination(invoicesApi.list);

  const doFetch = useCallback(() => {
    fetch({
      search: search || undefined,
      status,
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to: dateRange?.[1]?.format('YYYY-MM-DD'),
    });
  }, [fetch, search, status, dateRange]);

  useEffect(() => { doFetch(); }, [status, dateRange]);

  const columns = [
    {
      title: 'Mã hoá đơn',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/tenant/invoices/${row.id}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, row) => row.customer?.name ?? row.customerId ?? '—',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'total',
      width: 140,
      render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text>,
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paidAmount',
      key: 'paid',
      width: 140,
      render: (v) => fmt(v),
    },
    {
      title: 'Còn lại',
      key: 'remaining',
      width: 130,
      render: (_, row) => {
        const rem = Number(row.totalAmount) - Number(row.paidAmount);
        return rem > 0
          ? <Typography.Text type="danger">{fmt(rem)}</Typography.Text>
          : <Typography.Text type="secondary">0₫</Typography.Text>;
      },
    },
    {
      title: 'Hạn TT',
      dataIndex: 'dueDate',
      key: 'due',
      width: 110,
      render: (v) => {
        if (!v) return '—';
        const isOverdue = dayjs(v).isBefore(dayjs(), 'day');
        return (
          <Typography.Text type={isOverdue ? 'danger' : undefined}>
            {dayjs(v).format('DD/MM/YYYY')}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (v) => <InvoiceStatusBadge status={v} />,
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, row) =>
        row.status !== 'PAID' && (
          <Button size="small" type="primary" onClick={() => setPayModal(row)}>
            Thu tiền
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hoá đơn & Thanh toán"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewPayOpen(true)}>
            Tạo thanh toán
          </Button>
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm mã hoá đơn"
          style={{ width: 220 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={doFetch}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
          value={status}
          onChange={setStatus}
          allowClear
        />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          value={dateRange}
          onChange={setDateRange}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
      </Space>

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onChange={onTableChange}
        rowKey="id"
      />

      <PaymentModal
        open={!!payModal}
        invoice={payModal}
        onClose={() => setPayModal(null)}
        onPaid={() => { setPayModal(null); doFetch(); }}
      />

      <NewPaymentModal
        open={newPayOpen}
        onClose={() => setNewPayOpen(false)}
        onSuccess={() => { setNewPayOpen(false); doFetch(); }}
      />
    </div>
  );
}
