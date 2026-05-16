import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import CompactNumberInput from '@shared/components/CompactNumberInput';
import CashFundCard from '@tenant/components/CashFundCard';
import { cashApi, financeApi } from '@api/tenant.api';

const fmt = (value) => `${Number(value ?? 0).toLocaleString('vi-VN')}₫`;

const RECEIPT_TYPE_VALUES = ['CUSTOMER_PAYMENT', 'OTHER'];
const DISBURSEMENT_TYPE_VALUES = ['SUPPLIER_PAYMENT', 'SALARY', 'OVERHEAD', 'OTHER'];
const METHOD_VALUES = ['CASH', 'BANK_TRANSFER', 'CARD', 'E_WALLET'];

function useReceiptTypeOptions() {
  const { t } = useTranslation();
  return [
    { value: 'CUSTOMER_PAYMENT', label: t('finance.receiptTypeCustomerPayment') },
    { value: 'OTHER', label: t('finance.receiptTypeOther') },
  ];
}

function useDisbursementTypeOptions() {
  const { t } = useTranslation();
  return [
    { value: 'SUPPLIER_PAYMENT', label: t('finance.typeSupplierPayment') },
    { value: 'SALARY', label: t('finance.typeSalary') },
    { value: 'OVERHEAD', label: t('finance.typeOverhead') },
    { value: 'OTHER', label: t('finance.typeOther') },
  ];
}

function useMethodOptions() {
  const { t } = useTranslation();
  return [
    { value: 'CASH', label: t('finance.methodCash') },
    { value: 'BANK_TRANSFER', label: t('finance.methodBankTransfer') },
    { value: 'CARD', label: t('finance.methodCard') },
    { value: 'E_WALLET', label: t('finance.methodEWallet') },
  ];
}

function ReceiptModal({ open, onClose, onSaved, cashFunds, bankAccounts, presetFundId, editRecord }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const method = Form.useWatch('method', form);
  const receiptTypeOptions = useReceiptTypeOptions();
  const methodOptions = useMethodOptions();
  const isEdit = Boolean(editRecord);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (editRecord) {
      form.setFieldsValue({
        receiptType: editRecord.receiptType,
        amount: Number(editRecord.amount),
        method: editRecord.method,
        cashFundId: editRecord.cashFundId,
        bankAccountId: editRecord.bankAccountId,
        description: editRecord.description,
      });
    } else {
      form.setFieldsValue({
        method: presetFundId ? 'CASH' : 'BANK_TRANSFER',
        cashFundId: presetFundId,
        requiresApproval: false,
      });
    }
  }, [open, presetFundId, editRecord, form]);

  useEffect(() => {
    if (!open) return;
    if (method === 'CASH') {
      form.setFieldsValue({ bankAccountId: undefined, transactionRef: undefined });
    } else if (method) {
      form.setFieldsValue({ cashFundId: undefined });
    }
  }, [method, open, form]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await cashApi.updateReceipt(editRecord.id, {
          receiptType: values.receiptType,
          amount: values.amount,
          method: values.method,
          cashFundId: values.cashFundId,
          bankAccountId: values.bankAccountId,
          description: values.description,
        });
        message.success(t('finance.updateReceiptSuccess'));
      } else {
        await cashApi.createReceipt({
          kind: 'RECEIPT',
          receiptType: values.receiptType,
          amount: values.amount,
          method: values.method,
          cashFundId: values.cashFundId,
          bankAccountId: values.bankAccountId,
          description: values.description,
          requiresApproval: values.requiresApproval,
        });
        message.success(t('finance.createReceiptSuccess'));
      }
      onSaved?.();
      onClose?.();
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg === 'CASH_FUND_REQUIRED') message.error(t('finance.cashFundRequired'));
      else if (msg === 'BANK_ACCOUNT_REQUIRED') message.error(t('finance.bankAccountRequired'));
      else if (msg === 'CANNOT_EDIT_NON_PENDING') message.error(t('finance.cannotEditNonPending'));
      else message.error(isEdit ? t('finance.updateReceiptFailed') : t('finance.createReceiptFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item name="receiptType" label={t('finance.category')} rules={[{ required: true, message: t('finance.selectReceiptType') }]}>
        <Select options={receiptTypeOptions} />
      </Form.Item>
      <Form.Item name="amount" label={t('finance.amount')} rules={[{ required: true, message: t('finance.enterAmount') }]}>
        <CompactNumberInput
          min={0.01}
          style={{ width: '100%' }}
          wrapperStyle={{ width: '100%' }}
          formatGrouped
          suffix="₫"
        />
      </Form.Item>
      <Form.Item name="method" label={t('finance.method')} rules={[{ required: true, message: t('finance.selectMethod') }]}>
        <Select options={methodOptions} />
      </Form.Item>
      {method === 'CASH' ? (
        <Form.Item name="cashFundId" label={t('finance.cashFund')} rules={[{ required: true, message: t('finance.selectCashFund') }]}>
          <Select
            options={cashFunds.map((fund) => ({
              value: fund.id,
              label: `${fund.name} - ${fmt(fund.balance)}`,
            }))}
          />
        </Form.Item>
      ) : (
        <Form.Item
          name="bankAccountId"
          label={t('finance.bankAccount')}
          rules={[{ required: true, message: t('finance.selectBankAccount') }]}
        >
          <Select
            options={bankAccounts.map((account) => ({
              value: account.id,
              label: `${account.bankName} - ${account.accountNumber}`,
            }))}
          />
        </Form.Item>
      )}
      <Form.Item name="description" label={t('finance.description')} rules={[{ required: true, message: t('finance.enterDescription') }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      {!isEdit && (
        <Form.Item name="requiresApproval" valuePropName="checked">
          <Checkbox>{t('finance.requiresApprovalReceipt')}</Checkbox>
        </Form.Item>
      )}

      <Space>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          {isEdit ? t('finance.updateReceipt') : t('finance.saveReceipt')}
        </Button>
      </Space>
    </Form>
  );
}

function DisbursementModal({ open, onClose, onSaved, cashFunds, bankAccounts, presetFundId, editRecord }) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const targetType = Form.useWatch('targetType', form);
  const disbursementTypeOptions = useDisbursementTypeOptions();
  const isEdit = Boolean(editRecord);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (editRecord) {
      const existingTargetType = editRecord.cashFundId ? 'CASH_FUND' : 'BANK_ACCOUNT';
      form.setFieldsValue({
        disbursementType: editRecord.disbursementType,
        amount: Number(editRecord.amount),
        description: editRecord.description,
        targetType: existingTargetType,
        cashFundId: editRecord.cashFundId,
        bankAccountId: editRecord.bankAccountId,
      });
    } else {
      form.setFieldsValue({
        targetType: presetFundId ? 'CASH_FUND' : 'BANK_ACCOUNT',
        cashFundId: presetFundId,
        requiresApproval: true,
      });
    }
  }, [open, presetFundId, editRecord, form]);

  useEffect(() => {
    if (!open) return;
    if (targetType === 'CASH_FUND') {
      form.setFieldsValue({ bankAccountId: undefined });
    } else if (targetType === 'BANK_ACCOUNT') {
      form.setFieldsValue({ cashFundId: undefined });
    }
  }, [targetType, open, form]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await financeApi.updateDisbursement(editRecord.id, {
          disbursementType: values.disbursementType,
          amount: values.amount,
          description: values.description,
          targetType: values.targetType,
          cashFundId: values.cashFundId,
          bankAccountId: values.bankAccountId,
        });
        message.success(t('finance.updateDisbursementSuccess'));
      } else {
        await financeApi.createDisbursement({
          disbursementType: values.disbursementType,
          amount: values.amount,
          description: values.description,
          requiresApproval: values.requiresApproval,
          cashFundId: values.targetType === 'CASH_FUND' ? values.cashFundId : undefined,
          bankAccountId: values.targetType === 'BANK_ACCOUNT' ? values.bankAccountId : undefined,
        });
        message.success(t('finance.disburseSuccess'));
      }
      onSaved?.();
      onClose?.();
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg === 'LEDGER_TARGET_REQUIRED') message.error(t('finance.ledgerTargetRequired'));
      else if (msg === 'LEDGER_TARGET_AMBIGUOUS') message.error(t('finance.ledgerTargetAmbiguous'));
      else if (msg === 'CANNOT_EDIT_NON_PENDING') message.error(t('finance.cannotEditNonPending'));
      else message.error(isEdit ? t('finance.updateDisbursementFailed') : t('finance.createDisbursementFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Form.Item name="disbursementType" label={t('finance.category')} rules={[{ required: true, message: t('finance.selectDisbursementType') }]}>
        <Select options={disbursementTypeOptions} />
      </Form.Item>
      <Form.Item name="amount" label={t('finance.amount')} rules={[{ required: true, message: t('finance.enterAmount') }]}>
        <CompactNumberInput
          min={0.01}
          style={{ width: '100%' }}
          wrapperStyle={{ width: '100%' }}
          formatGrouped
          suffix="₫"
        />
      </Form.Item>
      <Form.Item name="targetType" label={t('finance.paymentSource')} rules={[{ required: true, message: t('finance.selectPaymentSource') }]}>
        <Select
          options={[
            { value: 'CASH_FUND', label: t('finance.cashFund') },
            { value: 'BANK_ACCOUNT', label: t('finance.bankAccount') },
          ]}
        />
      </Form.Item>
      {targetType === 'CASH_FUND' ? (
        <Form.Item name="cashFundId" label={t('finance.cashFund')} rules={[{ required: true, message: t('finance.selectCashFund') }]}>
          <Select
            options={cashFunds.map((fund) => ({
              value: fund.id,
              label: `${fund.name} - ${fmt(fund.balance)}`,
            }))}
          />
        </Form.Item>
      ) : (
        <Form.Item
          name="bankAccountId"
          label={t('finance.bankAccount')}
          rules={[{ required: true, message: t('finance.selectBankAccount') }]}
        >
          <Select
            options={bankAccounts.map((account) => ({
              value: account.id,
              label: `${account.bankName} - ${account.accountNumber}`,
            }))}
          />
        </Form.Item>
      )}
      <Form.Item name="description" label={t('finance.description')} rules={[{ required: true, message: t('finance.enterDescription') }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      {!isEdit && (
        <Form.Item name="requiresApproval" valuePropName="checked">
          <Checkbox>{t('finance.requiresApprovalDisbursement')}</Checkbox>
        </Form.Item>
      )}

      <Space>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          {isEdit ? t('finance.updateDisbursement') : t('finance.saveDisbursement')}
        </Button>
      </Space>
    </Form>
  );
}

function CashFundsTab({ cashFunds, onReceipt, onDisbursement }) {
  const { t } = useTranslation();
  return (
    <Row gutter={[16, 16]}>
      {cashFunds.map((fund) => (
        <Col key={fund.id} xs={24} sm={12} md={8} lg={6}>
          <CashFundCard fund={fund} onReceipt={onReceipt} onDisbursement={onDisbursement} />
        </Col>
      ))}
      {!cashFunds.length && (
        <Col span={24}>
          <Typography.Text type="secondary">{t('finance.noCashFunds')}</Typography.Text>
        </Col>
      )}
    </Row>
  );
}

function BankAccountsTab({ accounts }) {
  const { t } = useTranslation();
  const columns = [
    { title: t('finance.bankName'), dataIndex: 'bankName', key: 'bankName' },
    { title: t('finance.accountNumber'), dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: t('finance.accountName'), dataIndex: 'accountName', key: 'accountName' },
    {
      title: t('finance.balance'),
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (value) => fmt(value),
    },
    {
      title: t('common.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value) => (
        <Tag color={value ? 'green' : 'default'}>
          {value ? t('finance.activeStatus') : t('finance.inactiveStatus')}
        </Tag>
      ),
    },
  ];

  return <Table columns={columns} dataSource={accounts} rowKey="id" size="small" pagination={false} />;
}

function ReceiptsTab({ receipts, sourceLabelById, onCreateReceipt, onEditReceipt, onApproveReceipt }) {
  const { t } = useTranslation();
  const receiptTypeOptions = useReceiptTypeOptions();
  const columns = [
    {
      title: t('finance.category'),
      dataIndex: 'receiptType',
      key: 'receiptType',
      render: (value) => receiptTypeOptions.find((item) => item.value === value)?.label ?? value,
    },
    {
      title: t('finance.moneySource'),
      key: 'source',
      render: (_, row) => sourceLabelById[row.cashFundId] ?? sourceLabelById[row.bankAccountId] ?? '—',
    },
    { title: t('finance.method'), dataIndex: 'method', key: 'method' },
    {
      title: t('finance.amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value) => <Typography.Text type="success" strong>{`+${fmt(value)}`}</Typography.Text>,
    },
    { title: t('finance.description'), dataIndex: 'description', key: 'description' },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={value === 'APPROVED' ? 'green' : 'orange'}>{value}</Tag>,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 160,
      render: (_, row) =>
        row.status === 'PENDING' ? (
          <Space size={4}>
            <Button size="small" type="primary" onClick={() => onApproveReceipt(row.id)}>
              {t('finance.approve')}
            </Button>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEditReceipt(row)}>
              {t('common.edit')}
            </Button>
          </Space>
        ) : '—',
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateReceipt}>
          {t('finance.createReceipt')}
        </Button>
      </Space>
      <Table columns={columns} dataSource={receipts} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
    </>
  );
}

function DisbursementsTab({ disbursements, sourceLabelById, onApprove, onReject, onCreateDisbursement, onEditDisbursement }) {
  const { t } = useTranslation();
  const disbursementTypeOptions = useDisbursementTypeOptions();
  const columns = [
    {
      title: t('finance.category'),
      dataIndex: 'disbursementType',
      key: 'disbursementType',
      render: (value) => disbursementTypeOptions.find((item) => item.value === value)?.label ?? value,
    },
    {
      title: t('finance.paymentSource'),
      key: 'source',
      render: (_, row) => sourceLabelById[row.cashFundId] ?? sourceLabelById[row.bankAccountId] ?? '—',
    },
    {
      title: t('finance.amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value) => <Typography.Text type="danger" strong>{`-${fmt(value)}`}</Typography.Text>,
    },
    { title: t('finance.description'), dataIndex: 'description', key: 'description' },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value) => {
        const color = value === 'APPROVED' ? 'green' : value === 'REJECTED' ? 'red' : 'orange';
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 220,
      render: (_, row) =>
        row.status === 'PENDING_APPROVAL' ? (
          <Space size={4}>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEditDisbursement(row)}>
              {t('common.edit')}
            </Button>
            <Button size="small" type="primary" onClick={() => onApprove(row.id)}>
              {t('finance.approve')}
            </Button>
            <Popconfirm title={t('finance.rejectConfirm')} onConfirm={() => onReject(row.id)}>
              <Button size="small" danger>
                {t('finance.reject')}
              </Button>
            </Popconfirm>
          </Space>
        ) : '—',
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateDisbursement}>
          {t('finance.createDisbursement')}
        </Button>
      </Space>
      <Table columns={columns} dataSource={disbursements} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
    </>
  );
}

export default function Finance() {
  const { t } = useTranslation();
  const [cashFunds, setCashFunds] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [disbursementOpen, setDisbursementOpen] = useState(false);
  const [presetFundId, setPresetFundId] = useState(undefined);
  const [editReceipt, setEditReceipt] = useState(null);
  const [editDisbursement, setEditDisbursement] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      financeApi.cashFunds(),
      financeApi.bankAccounts(),
      cashApi.listReceipts({ kind: 'RECEIPT', limit: 100 }),
      financeApi.listDisbursements(),
    ])
      .then(([fundRes, bankRes, receiptRes, disbursementRes]) => {
        setCashFunds(fundRes.data?.data ?? fundRes.data ?? []);
        setBankAccounts(bankRes.data?.data ?? bankRes.data ?? []);
        setReceipts(receiptRes.data?.data?.data ?? receiptRes.data?.data ?? []);
        setDisbursements(disbursementRes.data?.data ?? disbursementRes.data ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = useMemo(
    () => disbursements.filter((item) => item.status === 'PENDING_APPROVAL').length,
    [disbursements],
  );

  const sourceLabelById = useMemo(() => {
    const labels = {};
    cashFunds.forEach((fund) => {
      labels[fund.id] = t('finance.fundLabel', { name: fund.name });
    });
    bankAccounts.forEach((account) => {
      labels[account.id] = t('finance.bankLabel', { bank: account.bankName, account: account.accountNumber });
    });
    return labels;
  }, [cashFunds, bankAccounts, t]);

  const openReceiptModal = (fund) => {
    setEditReceipt(null);
    setPresetFundId(fund?.id);
    setReceiptOpen(true);
  };

  const openEditReceiptModal = (record) => {
    setPresetFundId(undefined);
    setEditReceipt(record);
    setReceiptOpen(true);
  };

  const openDisbursementModal = (fund) => {
    setEditDisbursement(null);
    setPresetFundId(fund?.id);
    setDisbursementOpen(true);
  };

  const openEditDisbursementModal = (record) => {
    setPresetFundId(undefined);
    setEditDisbursement(record);
    setDisbursementOpen(true);
  };

  const closeReceiptModal = () => {
    setReceiptOpen(false);
    setPresetFundId(undefined);
    setEditReceipt(null);
  };

  const closeDisbursementModal = () => {
    setDisbursementOpen(false);
    setPresetFundId(undefined);
    setEditDisbursement(null);
  };

  const handleApproveReceipt = async (id) => {
    try {
      await cashApi.approveReceipt(id);
      message.success(t('finance.approveReceiptSuccess'));
      load();
    } catch {
      message.error(t('finance.approveReceiptFailed'));
    }
  };

  const handleApprove = async (id) => {
    try {
      await financeApi.approve(id);
      message.success(t('finance.approveSuccess'));
      load();
    } catch {
      message.error(t('finance.approveFailed'));
    }
  };

  const handleReject = async (id) => {
    try {
      await financeApi.reject(id, 'Rejected from finance settings');
      message.success(t('finance.rejectSuccess'));
      load();
    } catch {
      message.error(t('finance.rejectFailed'));
    }
  };

  return (
    <div>
      <PageHeader title={t('finance.title')} />

      <Spin spinning={loading}>
        <Card size="small">
          <Tabs
            items={[
              {
                key: 'cash-funds',
                label: t('finance.cashFunds'),
                children: (
                  <CashFundsTab
                    cashFunds={cashFunds}
                    onReceipt={openReceiptModal}
                    onDisbursement={openDisbursementModal}
                  />
                ),
              },
              {
                key: 'bank-accounts',
                label: t('finance.bankAccountsTab'),
                children: <BankAccountsTab accounts={bankAccounts} />,
              },
              {
                key: 'receipts',
                label: t('finance.receiptsTab'),
                children: (
                  <ReceiptsTab
                    receipts={receipts}
                    sourceLabelById={sourceLabelById}
                    onCreateReceipt={() => openReceiptModal()}
                    onEditReceipt={openEditReceiptModal}
                    onApproveReceipt={handleApproveReceipt}
                  />
                ),
              },
              {
                key: 'disbursements',
                label: <Badge count={pendingCount}>{t('finance.disbursementsTab')}</Badge>,
                children: (
                  <DisbursementsTab
                    disbursements={disbursements}
                    sourceLabelById={sourceLabelById}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onCreateDisbursement={() => openDisbursementModal()}
                    onEditDisbursement={openEditDisbursementModal}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Spin>

      <Modal
        open={receiptOpen}
        onCancel={closeReceiptModal}
        footer={null}
        title={editReceipt ? t('finance.editReceiptTitle') : t('finance.createReceiptTitle')}
        destroyOnHidden
        width={520}
      >
        <ReceiptModal
          open={receiptOpen}
          onClose={closeReceiptModal}
          onSaved={load}
          cashFunds={cashFunds}
          bankAccounts={bankAccounts}
          presetFundId={presetFundId}
          editRecord={editReceipt}
        />
      </Modal>

      <Modal
        open={disbursementOpen}
        onCancel={closeDisbursementModal}
        footer={null}
        title={editDisbursement ? t('finance.editDisbursementTitle') : t('finance.createDisbursementTitle')}
        destroyOnHidden
        width={520}
      >
        <DisbursementModal
          open={disbursementOpen}
          onClose={closeDisbursementModal}
          onSaved={load}
          cashFunds={cashFunds}
          bankAccounts={bankAccounts}
          presetFundId={presetFundId}
          editRecord={editDisbursement}
        />
      </Modal>
    </div>
  );
}
