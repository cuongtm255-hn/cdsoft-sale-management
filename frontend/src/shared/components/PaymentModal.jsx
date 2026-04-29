import { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Select, DatePicker, Input, Typography, message, Descriptions } from 'antd';
import dayjs from 'dayjs';
import { paymentsApi, cashApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const METHOD_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
  { label: 'Thẻ', value: 'CARD' },
  { label: 'Ví điện tử', value: 'E_WALLET' },
];

export default function PaymentModal({ open, invoice, onClose, onPaid }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const method = Form.useWatch('method', form);

  const remaining = invoice
    ? Number(invoice.total_amount ?? invoice.totalAmount ?? 0) - Number(invoice.paid_amount ?? invoice.paidAmount ?? 0)
    : 0;

  useEffect(() => {
    if (open && invoice) {
      form.setFieldsValue({
        amount: remaining,
        method: 'CASH',
        paidAt: dayjs(),
      });
      cashApi.listBankAccounts().then((r) => {
        setBankAccounts((r.data?.data ?? r.data ?? []).map((a) => ({
          label: `${a.bankName} — ${a.accountNumber}`,
          value: a.id,
        })));
      }).catch(() => {});
    }
  }, [open, invoice]);

  const handleOk = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    setLoading(true);
    try {
      const res = await paymentsApi.record({
        invoiceId: invoice.id,
        amount: values.amount,
        method: values.method,
        bankAccountId: values.bankAccountId,
        transactionRef: values.transactionRef,
        paidAt: values.paidAt?.toISOString(),
        notes: values.notes,
      });

      const data = res.data?.data ?? res.data;
      if (data?.fullyPaid) {
        message.success('Hoá đơn đã được thanh toán đầy đủ ✅');
      } else {
        message.success('Ghi nhận thanh toán thành công');
      }
      form.resetFields();
      onPaid?.();
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (msg === 'INVOICE_ALREADY_PAID') message.error('Hoá đơn đã thanh toán đủ');
      else if (msg === 'AMOUNT_EXCEEDS_REMAINING') message.error(`Vượt số tiền còn lại (${fmt(remaining)})`);
      else message.error('Ghi nhận thanh toán thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Ghi nhận thanh toán — ${invoice?.code ?? ''}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Xác nhận thu tiền"
      destroyOnClose
    >
      {invoice && (
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Tổng tiền">{fmt(invoice.total_amount ?? invoice.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán">{fmt(invoice.paid_amount ?? invoice.paidAmount)}</Descriptions.Item>
          <Descriptions.Item label={<Typography.Text type="danger">Còn lại</Typography.Text>}>
            <Typography.Text type="danger" strong>{fmt(remaining)}</Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="amount"
          label="Số tiền"
          rules={[
            { required: true, message: 'Nhập số tiền' },
            { type: 'number', min: 0.01, message: 'Số tiền phải > 0' },
            { type: 'number', max: remaining + 0.01, message: `Không được vượt ${fmt(remaining)}` },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.01}
            max={remaining}
            formatter={(v) => v?.toLocaleString('vi-VN')}
            addonAfter="₫"
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
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(d) => d && d.isAfter(dayjs(), 'day')}
          />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
