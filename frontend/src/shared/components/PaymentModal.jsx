import { useEffect, useState } from 'react';
import { DatePicker, Descriptions, Form, Input, Modal, Select, Typography, message } from 'antd';
import dayjs from 'dayjs';
import CompactNumberInput from '@shared/components/CompactNumberInput';
import { paymentsApi, cashApi } from '@api/tenant.api';

const fmt = (value) => `${Number(value || 0).toLocaleString('vi-VN')}₫`;

const METHOD_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
  { label: 'Thẻ', value: 'CARD' },
  { label: 'Ví điện tử', value: 'E_WALLET' },
];

export default function PaymentModal({ open, invoice, onClose, onPaid }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [cashFunds, setCashFunds] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const method = Form.useWatch('method', form);

  const remaining = invoice
    ? Number(invoice.total_amount ?? invoice.totalAmount ?? 0) - Number(invoice.paid_amount ?? invoice.paidAmount ?? 0)
    : 0;

  useEffect(() => {
    if (!open || !invoice) return;

    form.setFieldsValue({
      amount: remaining,
      method: 'CASH',
      paidAt: dayjs(),
      cashFundId: undefined,
      bankAccountId: undefined,
      transactionRef: undefined,
    });

    Promise.all([cashApi.listFunds(), cashApi.listBankAccounts()])
      .then(([fundRes, bankRes]) => {
        setCashFunds((fundRes.data?.data ?? fundRes.data ?? []).map((fund) => ({
          label: `${fund.name} - ${fmt(fund.balance)}`,
          value: fund.id,
        })));
        setBankAccounts((bankRes.data?.data ?? bankRes.data ?? []).map((account) => ({
          label: `${account.bankName} - ${account.accountNumber}`,
          value: account.id,
        })));
      })
      .catch(() => {});
  }, [open, invoice, remaining, form]);

  useEffect(() => {
    if (!open) return;
    if (method === 'CASH') {
      form.setFieldsValue({ bankAccountId: undefined, transactionRef: undefined });
    } else if (method) {
      form.setFieldsValue({ cashFundId: undefined });
    }
  }, [method, open, form]);

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setLoading(true);
    try {
      const response = await paymentsApi.record({
        invoiceId: invoice.id,
        amount: values.amount,
        method: values.method,
        cashFundId: values.cashFundId,
        bankAccountId: values.bankAccountId,
        transactionRef: values.transactionRef,
        paidAt: values.paidAt?.toISOString(),
        notes: values.notes,
      });

      const data = response.data?.data ?? response.data;
      message.success(data?.fullyPaid ? 'Hóa đơn đã được thanh toán đầy đủ' : 'Ghi nhận thanh toán thành công');
      form.resetFields();
      onPaid?.();
      onClose?.();
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg === 'INVOICE_ALREADY_PAID') message.error('Hóa đơn đã thanh toán đủ');
      else if (msg === 'AMOUNT_EXCEEDS_REMAINING') message.error(`Vượt số tiền còn lại (${fmt(remaining)})`);
      else if (msg === 'CASH_FUND_REQUIRED') message.error('Cần chọn quỹ tiền mặt');
      else if (msg === 'BANK_ACCOUNT_REQUIRED') message.error('Cần chọn tài khoản ngân hàng');
      else message.error('Ghi nhận thanh toán thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Ghi nhận thanh toán - ${invoice?.code ?? ''}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Xác nhận thu tiền"
      destroyOnHidden
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
            { type: 'number', min: 0.01, message: 'Số tiền phải lớn hơn 0' },
            { type: 'number', max: remaining + 0.01, message: `Không được vượt ${fmt(remaining)}` },
          ]}
        >
          <CompactNumberInput
            wrapperStyle={{ width: '100%' }}
            style={{ width: '100%' }}
            min={0.01}
            max={remaining}
            formatGrouped
            suffix="₫"
          />
        </Form.Item>

        <Form.Item name="method" label="Phương thức" rules={[{ required: true, message: 'Chọn phương thức' }]}>
          <Select options={METHOD_OPTIONS} />
        </Form.Item>

        {method === 'CASH' ? (
          <Form.Item
            name="cashFundId"
            label="Quỹ tiền mặt"
            rules={[{ required: true, message: 'Chọn quỹ tiền mặt' }]}
          >
            <Select options={cashFunds} placeholder="Chọn quỹ" />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="bankAccountId"
              label="Tài khoản ngân hàng"
              rules={[{ required: true, message: 'Chọn tài khoản ngân hàng' }]}
            >
              <Select options={bankAccounts} placeholder="Chọn tài khoản" />
            </Form.Item>
            <Form.Item name="transactionRef" label="Mã giao dịch">
              <Input placeholder="FT-123456" />
            </Form.Item>
          </>
        )}

        <Form.Item name="paidAt" label="Ngày thanh toán" rules={[{ required: true, message: 'Chọn ngày thanh toán' }]}>
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            disabledDate={(date) => date && date.isAfter(dayjs(), 'day')}
          />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
