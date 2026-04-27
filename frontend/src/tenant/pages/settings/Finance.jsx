import { useEffect, useState } from 'react';
import {
  Badge, Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Spin, Table, Tabs, Tag, Typography, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import CashFundCard from '@tenant/components/CashFundCard';
import { financeApi } from '@api/tenant.api';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');

const DISBURSEMENT_TYPES = [
  { value: 'SUPPLIER_PAYMENT', label: 'Trả nhà cung cấp' },
  { value: 'SALARY',           label: 'Chi lương' },
  { value: 'OVERHEAD',         label: 'Chi phí vận hành' },
  { value: 'OTHER',            label: 'Khác' },
];

function DisbursementModal({ open, onClose, cashFunds, onSaved }) {
  const [form]   = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await financeApi.createDisbursement(values);
      message.success('Đã tạo phiếu chi');
      form.resetFields();
      onSaved();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Tạo thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Phiếu chi thủ công"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
        <Form.Item name="disbursementType" label="Loại chi" rules={[{ required: true }]}>
          <Select options={DISBURSEMENT_TYPES} />
        </Form.Item>
        <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
          <InputNumber
            min={0.01}
            style={{ width: '100%' }}
            formatter={(v) => Number(v).toLocaleString('vi-VN')}
            parser={(v) => v.replace(/[^\d.]/g, '')}
            addonAfter="₫"
          />
        </Form.Item>
        <Form.Item name="cashFundId" label="Quỹ / Tài khoản">
          <Select placeholder="Chọn nguồn tiền" allowClear>
            {cashFunds.map((f) => (
              <Select.Option key={f.id} value={f.id}>
                {f.name} — {fmt(f.balance)}₫
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
          <Input.TextArea rows={2} placeholder="Mô tả phiếu chi..." />
        </Form.Item>
        <Form.Item name="requiresApproval" valuePropName="checked">
          <Checkbox>Yêu cầu phê duyệt trước khi thực hiện</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function CashFundsTab({ cashFunds, onDisbursement }) {
  return (
    <Row gutter={16}>
      {cashFunds.map((f) => (
        <Col key={f.id} xs={24} sm={12} md={8} lg={6}>
          <CashFundCard
            fund={f}
            onReceipt={() => message.info('Tính năng phiếu thu đang phát triển')}
            onDisbursement={() => onDisbursement(f)}
          />
        </Col>
      ))}
      {!cashFunds.length && (
        <Col span={24}>
          <Typography.Text type="secondary">Chưa có quỹ tiền mặt nào.</Typography.Text>
        </Col>
      )}
    </Row>
  );
}

function BankAccountsTab({ accounts }) {
  const columns = [
    { title: 'Ngân hàng',    dataIndex: 'bankName',      key: 'bankName' },
    { title: 'Số tài khoản', dataIndex: 'accountNumber', key: 'accountNumber' },
    { title: 'Tên TK',       dataIndex: 'accountName',   key: 'accountName' },
    { title: 'Chi nhánh',    dataIndex: 'branch',        key: 'branch', render: (v) => v ?? '—' },
    {
      title: 'Số dư', dataIndex: 'balance', key: 'balance', align: 'right',
      render: (v) => fmt(v) + '₫',
    },
    {
      title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hoạt động' : 'Ngưng'}</Tag>,
    },
  ];
  return (
    <Table
      columns={columns}
      dataSource={accounts}
      rowKey="id"
      size="small"
      pagination={false}
      locale={{ emptyText: 'Chưa có tài khoản ngân hàng' }}
    />
  );
}

function PendingTab({ items, onApprove, onReject }) {
  const columns = [
    { title: 'Loại chi',    dataIndex: 'disbursementType', key: 'type',   render: (v) => DISBURSEMENT_TYPES.find((t) => t.value === v)?.label ?? v },
    { title: 'Số tiền',    dataIndex: 'amount',           key: 'amount', align: 'right', render: (v) => fmt(v) + '₫' },
    { title: 'Mô tả',      dataIndex: 'description',      key: 'desc' },
    {
      title: 'Thao tác', key: 'actions', width: 160,
      render: (_, r) => (
        <Space size={4}>
          <Button type="primary" size="small" onClick={() => onApprove(r.id)}>Duyệt</Button>
          <Popconfirm
            title="Lý do từ chối?"
            onConfirm={() => onReject(r.id, 'Không được duyệt')}
          >
            <Button danger size="small">Từ chối</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={items}
      rowKey="id"
      size="small"
      pagination={false}
      locale={{ emptyText: 'Không có phiếu chi chờ duyệt' }}
    />
  );
}

export default function Finance() {
  const [cashFunds, setCashFunds]   = useState([]);
  const [accounts, setAccounts]     = useState([]);
  const [pending, setPending]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [disburseOpen, setDisburseOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      financeApi.cashFunds(),
      financeApi.bankAccounts(),
      financeApi.listDisbursements('PENDING_APPROVAL'),
    ]).then(([cf, ba, pd]) => {
      setCashFunds(cf.data?.data ?? cf.data ?? []);
      setAccounts(ba.data?.data ?? ba.data ?? []);
      setPending((pd.data?.data ?? pd.data) ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try { await financeApi.approve(id); message.success('Đã duyệt'); load(); }
    catch { message.error('Duyệt thất bại'); }
  };

  const handleReject = async (id, reason) => {
    try { await financeApi.reject(id, reason); message.success('Đã từ chối'); load(); }
    catch { message.error('Từ chối thất bại'); }
  };

  return (
    <div>
      <PageHeader
        title="Quỹ & Ngân hàng"
        extra={
          <Button icon={<PlusOutlined />} onClick={() => setDisburseOpen(true)}>
            Phiếu chi
          </Button>
        }
      />

      <Spin spinning={loading}>
        <Card size="small">
          <Tabs
            items={[
              {
                key: 'cash',
                label: 'Quỹ tiền mặt',
                children: <CashFundsTab cashFunds={cashFunds} onDisbursement={() => setDisburseOpen(true)} />,
              },
              {
                key: 'bank',
                label: 'Tài khoản ngân hàng',
                children: <BankAccountsTab accounts={accounts} />,
              },
              {
                key: 'pending',
                label: <Badge count={pending.length}>Chờ duyệt</Badge>,
                children: <PendingTab items={pending} onApprove={handleApprove} onReject={handleReject} />,
              },
            ]}
          />
        </Card>
      </Spin>

      <DisbursementModal
        open={disburseOpen}
        onClose={() => setDisburseOpen(false)}
        cashFunds={cashFunds}
        onSaved={load}
      />
    </div>
  );
}
