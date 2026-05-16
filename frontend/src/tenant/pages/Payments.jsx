import { useCallback, useEffect, useState } from 'react';
import { Button, DatePicker, Descriptions, Form, Input, Modal, Select, Space, Tabs, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import CompactNumberInput from '@shared/components/CompactNumberInput';
import DataTable from '@shared/components/DataTable';
import InvoiceStatusBadge from '@shared/components/InvoiceStatusBadge';
import PaymentModal from '@shared/components/PaymentModal';
import { usePagination } from '@shared/hooks/useApi';
import { cashApi, invoicesApi, paymentsApi, purchaseInvoicesApi } from '@api/tenant.api';

const fmt = (value) => `${Number(value || 0).toLocaleString('vi-VN')}₫`;

function NewPaymentModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cashFunds, setCashFunds] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const method = Form.useWatch('method', form);

  const loadInvoices = (search = '') => {
    invoicesApi.list({ search: search || undefined, limit: 50 })
      .then((response) => {
        const list = (response.data?.data?.data ?? response.data?.data ?? []).filter(
          (invoice) => !['PAID', 'CANCELLED'].includes(invoice.status),
        );
        const nextMap = {};
        list.forEach((invoice) => {
          nextMap[invoice.id] = invoice;
        });
        setInvoiceMap((prev) => ({ ...prev, ...nextMap }));
        setInvoiceOptions(list.map((invoice) => ({
          label: `${invoice.code} - ${invoice.customer_name ?? invoice.customerId ?? ''}`,
          value: invoice.id,
        })));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    loadInvoices();
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
    form.resetFields();
    form.setFieldsValue({ method: 'CASH', paidAt: dayjs() });
    setSelectedInvoice(null);
  }, [open, form]);

  useEffect(() => {
    if (!open) return;
    if (method === 'CASH') {
      form.setFieldsValue({ bankAccountId: undefined, transactionRef: undefined });
    } else if (method) {
      form.setFieldsValue({ cashFundId: undefined });
    }
  }, [method, open, form]);

  const handleInvoiceSelect = (id) => {
    const invoice = invoiceMap[id];
    setSelectedInvoice(invoice ?? null);
    if (!invoice) return;
    const remaining = Number(invoice.total_amount ?? invoice.totalAmount ?? 0) - Number(invoice.paid_amount ?? invoice.paidAmount ?? 0);
    form.setFieldValue('amount', remaining);
  };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setLoading(true);
    try {
      await paymentsApi.record({
        invoiceId: values.invoiceId,
        amount: values.amount,
        method: values.method,
        cashFundId: values.cashFundId,
        bankAccountId: values.bankAccountId,
        transactionRef: values.transactionRef,
        paidAt: values.paidAt?.toISOString(),
        notes: values.notes,
      });
      message.success(t('payments.paymentSuccess'));
      onSuccess?.();
      onClose?.();
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg === 'INVOICE_ALREADY_PAID') message.error(t('payments.alreadyPaid'));
      else if (msg === 'AMOUNT_EXCEEDS_REMAINING') message.error(t('payments.amountExceedsRemaining'));
      else if (msg === 'CASH_FUND_REQUIRED') message.error('Cần chọn quỹ tiền mặt');
      else if (msg === 'BANK_ACCOUNT_REQUIRED') message.error('Cần chọn tài khoản ngân hàng');
      else message.error(t('payments.paymentFailed'));
    } finally {
      setLoading(false);
    }
  };

  const remaining = selectedInvoice
    ? Number(selectedInvoice.total_amount ?? selectedInvoice.totalAmount ?? 0) - Number(selectedInvoice.paid_amount ?? selectedInvoice.paidAmount ?? 0)
    : 0;

  const methodOptions = [
    { label: t('payments.methodCash'), value: 'CASH' },
    { label: t('payments.methodTransfer'), value: 'BANK_TRANSFER' },
    { label: t('payments.methodCard'), value: 'CARD' },
    { label: t('payments.methodEwallet'), value: 'E_WALLET' },
  ];

  return (
    <Modal
      title={t('payments.newPaymentTitle')}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText={t('payments.confirmCollection')}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="invoiceId" label={t('payments.invoice')} rules={[{ required: true, message: t('payments.selectInvoicePlaceholder') }]}>
          <Select
            showSearch
            placeholder={t('payments.invoiceSearchPlaceholder')}
            options={invoiceOptions}
            onSearch={loadInvoices}
            filterOption={false}
            onChange={handleInvoiceSelect}
          />
        </Form.Item>

        {selectedInvoice && (
          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label={t('payments.totalAmount')}>{fmt(selectedInvoice.total_amount ?? selectedInvoice.totalAmount)}</Descriptions.Item>
            <Descriptions.Item label={t('payments.paidAmount')}>{fmt(selectedInvoice.paid_amount ?? selectedInvoice.paidAmount)}</Descriptions.Item>
            <Descriptions.Item label={<Typography.Text type="danger">{t('payments.remaining')}</Typography.Text>}>
              <Typography.Text type="danger" strong>{fmt(remaining)}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('payments.dueDate')}>
              {selectedInvoice.dueDate ? dayjs(selectedInvoice.dueDate).format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}

        <Form.Item
          name="amount"
          label={t('payments.amount')}
          rules={[
            { required: true, message: t('payments.amountRequired') },
            { type: 'number', min: 0.01, message: t('payments.amountMustPositive') },
            ...(remaining > 0 ? [{ type: 'number', max: remaining + 0.01, message: t('payments.amountExceeds', { amount: fmt(remaining) }) }] : []),
          ]}
        >
          <CompactNumberInput
            wrapperStyle={{ width: '100%' }}
            style={{ width: '100%' }}
            min={0.01}
            formatGrouped
            suffix="₫"
            disabled={!selectedInvoice}
          />
        </Form.Item>

        <Form.Item name="method" label={t('payments.method')} rules={[{ required: true }]}>
          <Select options={methodOptions} />
        </Form.Item>

        {method === 'CASH' ? (
          <Form.Item name="cashFundId" label="Quỹ tiền mặt" rules={[{ required: true, message: 'Chọn quỹ tiền mặt' }]}>
            <Select options={cashFunds} placeholder="Chọn quỹ" />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="bankAccountId"
              label={t('payments.bankAccount')}
              rules={[{ required: true, message: t('payments.selectAccount') }]}
            >
              <Select options={bankAccounts} placeholder={t('payments.selectAccount')} />
            </Form.Item>
            <Form.Item name="transactionRef" label={t('payments.transactionRef')}>
              <Input placeholder={t('payments.transactionRefPlaceholder')} />
            </Form.Item>
          </>
        )}

        <Form.Item name="paidAt" label={t('payments.paymentDate')} rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(date) => date && date.isAfter(dayjs(), 'day')} />
        </Form.Item>

        <Form.Item name="notes" label={t('payments.noteLabel')}>
          <Input.TextArea rows={2} placeholder={t('payments.notePlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function SupplierPaymentModal({ open, purchaseInvoice, onClose, onPaid }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [cashFunds, setCashFunds] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const method = Form.useWatch('method', form);

  const remaining = purchaseInvoice
    ? Number(purchaseInvoice.total_amount ?? purchaseInvoice.totalAmount ?? 0) - Number(purchaseInvoice.paid_amount ?? purchaseInvoice.paidAmount ?? 0)
    : 0;

  useEffect(() => {
    if (!open || !purchaseInvoice) return;
    form.setFieldsValue({
      amount: remaining,
      method: 'BANK_TRANSFER',
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
  }, [open, purchaseInvoice, remaining, form]);

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
      const response = await paymentsApi.recordSupplierPayment({
        purchaseInvoiceId: purchaseInvoice.id,
        amount: values.amount,
        method: values.method,
        cashFundId: values.cashFundId,
        bankAccountId: values.bankAccountId,
        transactionRef: values.transactionRef,
        paidAt: values.paidAt?.toISOString(),
        notes: values.notes,
      });
      const data = response.data?.data ?? response.data;
      message.success(data?.fullyPaid ? 'Công nợ NCC đã được thanh toán đủ' : 'Ghi nhận chi tiền NCC thành công');
      form.resetFields();
      onPaid?.();
      onClose?.();
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg === 'PURCHASE_INVOICE_ALREADY_PAID') message.error('Chứng từ mua hàng đã thanh toán đủ');
      else if (msg === 'AMOUNT_EXCEEDS_REMAINING') message.error(`Vượt số tiền còn phải trả (${fmt(remaining)})`);
      else if (msg === 'CASH_FUND_REQUIRED') message.error('Cần chọn quỹ tiền mặt');
      else if (msg === 'BANK_ACCOUNT_REQUIRED') message.error('Cần chọn tài khoản ngân hàng');
      else message.error('Ghi nhận chi tiền NCC thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Thanh toán NCC - ${purchaseInvoice?.code ?? ''}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Xác nhận chi tiền"
      destroyOnHidden
    >
      {purchaseInvoice && (
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Nhà cung cấp">{purchaseInvoice.supplier_name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">{fmt(purchaseInvoice.total_amount ?? purchaseInvoice.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán">{fmt(purchaseInvoice.paid_amount ?? purchaseInvoice.paidAmount)}</Descriptions.Item>
          <Descriptions.Item label={<Typography.Text type="danger">Còn phải trả</Typography.Text>}>
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
          <Select
            options={[
              { label: 'Tiền mặt', value: 'CASH' },
              { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
              { label: 'Thẻ', value: 'CARD' },
              { label: 'Ví điện tử', value: 'E_WALLET' },
            ]}
          />
        </Form.Item>

        {method === 'CASH' ? (
          <Form.Item name="cashFundId" label="Quỹ tiền mặt" rules={[{ required: true, message: 'Chọn quỹ tiền mặt' }]}>
            <Select options={cashFunds} placeholder="Chọn quỹ" />
          </Form.Item>
        ) : (
          <>
            <Form.Item name="bankAccountId" label="Tài khoản ngân hàng" rules={[{ required: true, message: 'Chọn tài khoản ngân hàng' }]}>
              <Select options={bankAccounts} placeholder="Chọn tài khoản" />
            </Form.Item>
            <Form.Item name="transactionRef" label="Mã giao dịch">
              <Input placeholder="FT-123456" />
            </Form.Item>
          </>
        )}

        <Form.Item name="paidAt" label="Ngày thanh toán" rules={[{ required: true, message: 'Chọn ngày thanh toán' }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(date) => date && date.isAfter(dayjs(), 'day')} />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function NewSupplierPaymentModal({ open, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [invoiceMap, setInvoiceMap] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [cashFunds, setCashFunds] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const method = Form.useWatch('method', form);

  const loadPurchaseInvoices = (search = '') => {
    purchaseInvoicesApi.list({ search: search || undefined, limit: 50 })
      .then((response) => {
        const list = (response.data?.data?.data ?? response.data?.data ?? []).filter(
          (invoice) => !['PAID', 'CANCELLED'].includes(invoice.status),
        );
        const nextMap = {};
        list.forEach((invoice) => {
          nextMap[invoice.id] = invoice;
        });
        setInvoiceMap((prev) => ({ ...prev, ...nextMap }));
        setInvoiceOptions(list.map((invoice) => ({
          label: `${invoice.code} - ${invoice.supplier_name ?? ''}`,
          value: invoice.id,
        })));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    loadPurchaseInvoices();
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
    form.resetFields();
    form.setFieldsValue({ method: 'BANK_TRANSFER', paidAt: dayjs() });
    setSelectedInvoice(null);
  }, [open, form]);

  useEffect(() => {
    if (!open) return;
    if (method === 'CASH') {
      form.setFieldsValue({ bankAccountId: undefined, transactionRef: undefined });
    } else if (method) {
      form.setFieldsValue({ cashFundId: undefined });
    }
  }, [method, open, form]);

  const handleSelect = (id) => {
    const invoice = invoiceMap[id];
    setSelectedInvoice(invoice ?? null);
    if (!invoice) return;
    const remaining = Number(invoice.total_amount ?? invoice.totalAmount ?? 0) - Number(invoice.paid_amount ?? invoice.paidAmount ?? 0);
    form.setFieldValue('amount', remaining);
  };

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setLoading(true);
    try {
      await paymentsApi.recordSupplierPayment({
        purchaseInvoiceId: values.purchaseInvoiceId,
        amount: values.amount,
        method: values.method,
        cashFundId: values.cashFundId,
        bankAccountId: values.bankAccountId,
        transactionRef: values.transactionRef,
        paidAt: values.paidAt?.toISOString(),
        notes: values.notes,
      });
      message.success('Đã ghi nhận chi tiền NCC');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg === 'PURCHASE_INVOICE_ALREADY_PAID') message.error('Chứng từ mua hàng đã thanh toán đủ');
      else if (msg === 'AMOUNT_EXCEEDS_REMAINING') message.error('Số tiền vượt quá công nợ còn lại');
      else if (msg === 'CASH_FUND_REQUIRED') message.error('Cần chọn quỹ tiền mặt');
      else if (msg === 'BANK_ACCOUNT_REQUIRED') message.error('Cần chọn tài khoản ngân hàng');
      else message.error('Ghi nhận chi tiền NCC thất bại');
    } finally {
      setLoading(false);
    }
  };

  const remaining = selectedInvoice
    ? Number(selectedInvoice.total_amount ?? selectedInvoice.totalAmount ?? 0) - Number(selectedInvoice.paid_amount ?? selectedInvoice.paidAmount ?? 0)
    : 0;

  return (
    <Modal
      title="Chi tiền nhà cung cấp"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Xác nhận chi tiền"
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="purchaseInvoiceId" label="Chứng từ mua hàng" rules={[{ required: true, message: 'Chọn chứng từ mua hàng' }]}>
          <Select
            showSearch
            placeholder="Tìm theo mã chứng từ hoặc NCC"
            options={invoiceOptions}
            onSearch={loadPurchaseInvoices}
            filterOption={false}
            onChange={handleSelect}
          />
        </Form.Item>

        {selectedInvoice && (
          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Nhà cung cấp">{selectedInvoice.supplier_name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Mã PO">{selectedInvoice.purchase_order_code ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">{fmt(selectedInvoice.total_amount ?? selectedInvoice.totalAmount)}</Descriptions.Item>
            <Descriptions.Item label={<Typography.Text type="danger">Còn phải trả</Typography.Text>}>
              <Typography.Text type="danger" strong>{fmt(remaining)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        )}

        <Form.Item
          name="amount"
          label="Số tiền"
          rules={[
            { required: true, message: 'Nhập số tiền' },
            { type: 'number', min: 0.01, message: 'Số tiền phải lớn hơn 0' },
            ...(remaining > 0 ? [{ type: 'number', max: remaining + 0.01, message: `Không được vượt ${fmt(remaining)}` }] : []),
          ]}
        >
          <CompactNumberInput
            wrapperStyle={{ width: '100%' }}
            style={{ width: '100%' }}
            min={0.01}
            formatGrouped
            suffix="₫"
            disabled={!selectedInvoice}
          />
        </Form.Item>

        <Form.Item name="method" label="Phương thức" rules={[{ required: true, message: 'Chọn phương thức' }]}>
          <Select
            options={[
              { label: 'Tiền mặt', value: 'CASH' },
              { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
              { label: 'Thẻ', value: 'CARD' },
              { label: 'Ví điện tử', value: 'E_WALLET' },
            ]}
          />
        </Form.Item>

        {method === 'CASH' ? (
          <Form.Item name="cashFundId" label="Quỹ tiền mặt" rules={[{ required: true, message: 'Chọn quỹ tiền mặt' }]}>
            <Select options={cashFunds} placeholder="Chọn quỹ" />
          </Form.Item>
        ) : (
          <>
            <Form.Item name="bankAccountId" label="Tài khoản ngân hàng" rules={[{ required: true, message: 'Chọn tài khoản ngân hàng' }]}>
              <Select options={bankAccounts} placeholder="Chọn tài khoản" />
            </Form.Item>
            <Form.Item name="transactionRef" label="Mã giao dịch">
              <Input placeholder="FT-123456" />
            </Form.Item>
          </>
        )}

        <Form.Item name="paidAt" label="Ngày thanh toán" rules={[{ required: true, message: 'Chọn ngày thanh toán' }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(date) => date && date.isAfter(dayjs(), 'day')} />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function Payments() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('receivable');
  const [arSearch, setArSearch] = useState('');
  const [arStatus, setArStatus] = useState(undefined);
  const [arDateRange, setArDateRange] = useState(null);
  const [apSearch, setApSearch] = useState('');
  const [apStatus, setApStatus] = useState(undefined);
  const [apDateRange, setApDateRange] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [supplierPayModal, setSupplierPayModal] = useState(null);
  const [newPayOpen, setNewPayOpen] = useState(false);
  const [newSupplierPayOpen, setNewSupplierPayOpen] = useState(false);

  const {
    fetch: fetchArPage,
    loading: arLoading,
    data: arData,
    pagination: arTablePagination,
    onTableChange: onArTableChange,
  } = usePagination(invoicesApi.list);
  const {
    fetch: fetchApPage,
    loading: apLoading,
    data: apData,
    pagination: apTablePagination,
    onTableChange: onApTableChange,
  } = usePagination(purchaseInvoicesApi.list);

  const fetchReceivables = useCallback(() => {
    fetchArPage({
      search: arSearch || undefined,
      status: arStatus,
      from: arDateRange?.[0]?.format('YYYY-MM-DD'),
      to: arDateRange?.[1]?.format('YYYY-MM-DD'),
    });
  }, [fetchArPage, arSearch, arStatus, arDateRange]);

  const fetchPayables = useCallback(() => {
    fetchApPage({
      search: apSearch || undefined,
      status: apStatus,
      from: apDateRange?.[0]?.format('YYYY-MM-DD'),
      to: apDateRange?.[1]?.format('YYYY-MM-DD'),
    });
  }, [fetchApPage, apSearch, apStatus, apDateRange]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables, arStatus, arDateRange]);

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables, apStatus, apDateRange]);

  const arStatusOptions = [
    { label: t('payments.all'), value: undefined },
    { label: t('payments.unpaid'), value: 'UNPAID' },
    { label: t('payments.partial'), value: 'PARTIALLY_PAID' },
    { label: t('payments.paid'), value: 'PAID' },
  ];

  const apStatusOptions = [
    { label: 'Tất cả', value: undefined },
    { label: 'Chưa thanh toán', value: 'UNPAID' },
    { label: 'Thanh toán một phần', value: 'PARTIALLY_PAID' },
    { label: 'Đã thanh toán', value: 'PAID' },
  ];

  const receivableColumns = [
    {
      title: t('payments.invoiceCode'),
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (value, row) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => navigate(`/tenant/invoices/${row.id}`)}>
          {value}
        </Button>
      ),
    },
    {
      title: t('payments.customer'),
      key: 'customer',
      render: (_, row) => row.customer_name ?? row.customer?.name ?? row.customerId ?? '—',
    },
    {
      title: t('payments.totalAmount'),
      dataIndex: 'total_amount',
      key: 'total',
      width: 140,
      render: (value) => <Typography.Text strong>{fmt(value)}</Typography.Text>,
    },
    {
      title: t('payments.paidAmount'),
      dataIndex: 'paid_amount',
      key: 'paid',
      width: 140,
      render: (value) => fmt(value),
    },
    {
      title: t('payments.remaining'),
      key: 'remaining',
      width: 130,
      render: (_, row) => {
        const remaining = Number(row.total_amount) - Number(row.paid_amount);
        return remaining > 0
          ? <Typography.Text type="danger">{fmt(remaining)}</Typography.Text>
          : <Typography.Text type="secondary">0₫</Typography.Text>;
      },
    },
    {
      title: t('payments.dueDate'),
      key: 'due',
      width: 110,
      render: (_, row) => {
        const value = row.due_date ?? row.dueDate;
        if (!value) return '—';
        const isOverdue = dayjs(value).isBefore(dayjs(), 'day');
        return <Typography.Text type={isOverdue ? 'danger' : undefined}>{dayjs(value).format('DD/MM/YYYY')}</Typography.Text>;
      },
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (value) => <InvoiceStatusBadge status={value} />,
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_, row) =>
        row.status !== 'PAID' && (
          <Button size="small" type="primary" onClick={() => setPayModal(row)}>
            {t('payments.collectPayment')}
          </Button>
        ),
    },
  ];

  const payableColumns = [
    {
      title: 'Mã chứng từ',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Nhà cung cấp',
      key: 'supplier',
      render: (_, row) => row.supplier_name ?? row.supplier_code ?? '—',
    },
    {
      title: 'Nguồn phát sinh',
      key: 'source',
      render: (_, row) => row.purchase_order_code ?? row.stock_receipt_code ?? '—',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      key: 'total',
      width: 140,
      render: (value) => <Typography.Text strong>{fmt(value)}</Typography.Text>,
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paid_amount',
      key: 'paid',
      width: 140,
      render: (value) => fmt(value),
    },
    {
      title: 'Còn phải trả',
      key: 'remaining',
      width: 140,
      render: (_, row) => {
        const remaining = Number(row.total_amount) - Number(row.paid_amount);
        return remaining > 0
          ? <Typography.Text type="danger">{fmt(remaining)}</Typography.Text>
          : <Typography.Text type="secondary">0₫</Typography.Text>;
      },
    },
    {
      title: 'Đến hạn',
      key: 'dueDate',
      width: 110,
      render: (_, row) => {
        const value = row.due_date ?? row.ap_due_date;
        if (!value) return '—';
        const isOverdue = dayjs(value).isBefore(dayjs(), 'day');
        return <Typography.Text type={isOverdue ? 'danger' : undefined}>{dayjs(value).format('DD/MM/YYYY')}</Typography.Text>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (value) => <InvoiceStatusBadge status={value} />,
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_, row) =>
        row.status !== 'PAID' && (
          <Button size="small" type="primary" danger onClick={() => setSupplierPayModal(row)}>
            Chi tiền
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('payments.title')}
        extra={(
          activeTab === 'receivable' ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setNewPayOpen(true)}>
              {t('payments.createPayment')}
            </Button>
          ) : (
            <Button type="primary" danger icon={<PlusOutlined />} onClick={() => setNewSupplierPayOpen(true)}>
              Chi tiền NCC
            </Button>
          )
        )}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'receivable',
            label: 'Phải thu KH',
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Input.Search
                    placeholder={t('payments.searchPlaceholder')}
                    style={{ width: 220 }}
                    value={arSearch}
                    onChange={(event) => setArSearch(event.target.value)}
                    onSearch={fetchReceivables}
                    allowClear
                  />
                  <Select
                    placeholder={t('common.status')}
                    options={arStatusOptions}
                    style={{ width: 180 }}
                    value={arStatus}
                    onChange={setArStatus}
                    allowClear
                  />
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    value={arDateRange}
                    onChange={setArDateRange}
                    placeholder={[t('common.fromDate'), t('common.toDate')]}
                  />
                </Space>

                <DataTable
                  columns={receivableColumns}
                  dataSource={arData}
                  loading={arLoading}
                  pagination={arTablePagination}
                  onChange={onArTableChange}
                  rowKey="id"
                />
              </>
            ),
          },
          {
            key: 'payable',
            label: 'Phải trả NCC',
            children: (
              <>
                <Space style={{ marginBottom: 16 }} wrap>
                  <Input.Search
                    placeholder="Tìm chứng từ mua hàng"
                    style={{ width: 220 }}
                    value={apSearch}
                    onChange={(event) => setApSearch(event.target.value)}
                    onSearch={fetchPayables}
                    allowClear
                  />
                  <Select
                    placeholder="Trạng thái"
                    options={apStatusOptions}
                    style={{ width: 180 }}
                    value={apStatus}
                    onChange={setApStatus}
                    allowClear
                  />
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    value={apDateRange}
                    onChange={setApDateRange}
                    placeholder={['Từ ngày', 'Đến ngày']}
                  />
                </Space>

                <DataTable
                  columns={payableColumns}
                  dataSource={apData}
                  loading={apLoading}
                  pagination={apTablePagination}
                  onChange={onApTableChange}
                  rowKey="id"
                />
              </>
            ),
          },
        ]}
      />

      <PaymentModal
        open={!!payModal}
        invoice={payModal}
        onClose={() => setPayModal(null)}
        onPaid={() => {
          setPayModal(null);
          fetchReceivables();
        }}
      />

      <SupplierPaymentModal
        open={!!supplierPayModal}
        purchaseInvoice={supplierPayModal}
        onClose={() => setSupplierPayModal(null)}
        onPaid={() => {
          setSupplierPayModal(null);
          fetchPayables();
        }}
      />

      <NewPaymentModal
        open={newPayOpen}
        onClose={() => setNewPayOpen(false)}
        onSuccess={() => {
          setNewPayOpen(false);
          fetchReceivables();
        }}
      />

      <NewSupplierPaymentModal
        open={newSupplierPayOpen}
        onClose={() => setNewSupplierPayOpen(false)}
        onSuccess={() => {
          setNewSupplierPayOpen(false);
          fetchPayables();
        }}
      />
    </div>
  );
}
