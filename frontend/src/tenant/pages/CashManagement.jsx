import { useEffect, useState } from 'react';
import {
  Button, Tabs, Space, Typography, Modal, Form, Input, InputNumber,
  Select, DatePicker, Table, Tag, message, Card, Row, Col,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { cashApi } from '@api/tenant.api';

const fmt = (v) => Number(v || 0).toLocaleString('vi-VN') + '₫';

const KIND_OPTIONS = [
  { label: 'Phiếu thu', value: 'RECEIPT' },
  { label: 'Phiếu chi', value: 'DISBURSEMENT' },
];

const RECEIPT_TYPE_OPTIONS = [
  { label: 'Thu từ khách hàng', value: 'CUSTOMER_PAYMENT' },
  { label: 'Thu khác', value: 'OTHER' },
];

const DISB_TYPE_OPTIONS = [
  { label: 'Thanh toán NCC', value: 'SUPPLIER_PAYMENT' },
  { label: 'Chi phí', value: 'EXPENSE' },
  { label: 'Chi khác', value: 'OTHER' },
];

const METHOD_OPTIONS = [
  { label: 'Tiền mặt', value: 'CASH' },
  { label: 'Chuyển khoản', value: 'BANK_TRANSFER' },
];

function FundsTab() {
  const [funds, setFunds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fundModal, setFundModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [form] = Form.useForm();
  const [bankForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [f, b] = await Promise.all([cashApi.listFunds(), cashApi.listBankAccounts()]);
      setFunds(f.data?.data ?? f.data ?? []);
      setAccounts(b.data?.data ?? b.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreateFund = async () => {
    try {
      const values = await form.validateFields();
      await cashApi.createFund(values);
      message.success('Tạo quỹ thành công');
      form.resetFields();
      setFundModal(false);
      load();
    } catch { message.error('Tạo quỹ thất bại'); }
  };

  const handleCreateBank = async () => {
    try {
      const values = await bankForm.validateFields();
      await cashApi.createBankAccount(values);
      message.success('Thêm tài khoản thành công');
      bankForm.resetFields();
      setBankModal(false);
      load();
    } catch { message.error('Thêm tài khoản thất bại'); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {funds.map((f) => (
          <Col key={f.id} xs={24} sm={12} md={8}>
            <Card
              size="small"
              title={f.name}
              extra={<Tag color="blue">{f.currency}</Tag>}
              style={{ marginBottom: 8 }}
            >
              <Typography.Title level={4} style={{ margin: 0, color: '#1677ff' }}>
                {fmt(f.balance)}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={() => setFundModal(true)}>Thêm quỹ</Button>
        <Button icon={<PlusOutlined />} onClick={() => setBankModal(true)}>Thêm tài khoản NH</Button>
      </Space>

      <Typography.Title level={5}>Tài khoản ngân hàng</Typography.Title>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={accounts}
        loading={loading}
        columns={[
          { title: 'Ngân hàng', dataIndex: 'bankName' },
          { title: 'Số tài khoản', dataIndex: 'accountNumber' },
          { title: 'Tên tài khoản', dataIndex: 'accountName' },
          { title: 'Số dư', dataIndex: 'balance', render: (v) => <Typography.Text strong>{fmt(v)}</Typography.Text> },
        ]}
      />

      <Modal title="Tạo quỹ tiền mặt" open={fundModal} onOk={handleCreateFund} onCancel={() => setFundModal(false)} okText="Tạo">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên quỹ" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="balance" label="Số dư ban đầu"><InputNumber style={{ width: '100%' }} min={0} formatter={(v) => v?.toLocaleString('vi-VN')} addonAfter="₫" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Thêm tài khoản ngân hàng" open={bankModal} onOk={handleCreateBank} onCancel={() => setBankModal(false)} okText="Thêm">
        <Form form={bankForm} layout="vertical">
          <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accountNumber" label="Số tài khoản" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="accountName" label="Tên tài khoản" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ReceiptsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);
  const [modal, setModal] = useState(false);
  const [funds, setFunds] = useState([]);
  const [form] = Form.useForm();
  const watchedKind = Form.useWatch('kind', form);

  const load = async () => {
    setLoading(true);
    try {
      const res = await cashApi.listReceipts({
        kind,
        from: dateRange?.[0]?.format('YYYY-MM-DD'),
        to: dateRange?.[1]?.format('YYYY-MM-DD'),
      });
      setData(res.data?.data?.data ?? res.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [kind, dateRange]);

  useEffect(() => {
    cashApi.listFunds().then((r) => setFunds((r.data?.data ?? r.data ?? []).map((f) => ({ label: f.name, value: f.id }))));
  }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await cashApi.createReceipt(values);
      message.success('Tạo phiếu thành công');
      form.resetFields();
      setModal(false);
      load();
    } catch { message.error('Tạo phiếu thất bại'); }
  };

  const columns = [
    {
      title: 'Loại', dataIndex: 'kind', key: 'kind', width: 110,
      render: (v) => <Tag color={v === 'RECEIPT' ? 'green' : 'red'}>{v === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}</Tag>,
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc' },
    { title: 'Phương thức', dataIndex: 'method', key: 'method', width: 130 },
    {
      title: 'Số tiền', dataIndex: 'amount', key: 'amount', width: 130,
      render: (v, row) => (
        <Typography.Text type={row.kind === 'RECEIPT' ? 'success' : 'danger'} strong>
          {row.kind === 'RECEIPT' ? '+' : '-'}{fmt(v)}
        </Typography.Text>
      ),
    },
    {
      title: 'Ngày', dataIndex: 'createdAt', key: 'date', width: 110,
      render: (v) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110,
      render: (v) => <Tag color={v === 'APPROVED' ? 'green' : 'orange'}>{v === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}</Tag>,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Loại phiếu" options={[{ label: 'Tất cả', value: undefined }, ...KIND_OPTIONS]} style={{ width: 150 }} value={kind} onChange={setKind} allowClear />
        <DatePicker.RangePicker format="DD/MM/YYYY" value={dateRange} onChange={setDateRange} placeholder={['Từ ngày', 'Đến ngày']} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>Tạo phiếu</Button>
      </Space>

      <DataTable columns={columns} dataSource={data} loading={loading} pagination={false} rowKey="id" />

      <Modal title="Tạo phiếu thu / chi" open={modal} onOk={handleCreate} onCancel={() => { setModal(false); form.resetFields(); }} okText="Lưu" width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="kind" label="Loại" rules={[{ required: true }]}>
            <Select options={KIND_OPTIONS} />
          </Form.Item>
          <Form.Item name="receiptType" label="Phân loại" rules={[{ required: true }]}>
            <Select options={watchedKind === 'DISBURSEMENT' ? DISB_TYPE_OPTIONS : RECEIPT_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} formatter={(v) => v?.toLocaleString('vi-VN')} addonAfter="₫" />
          </Form.Item>
          <Form.Item name="cashFundId" label="Quỹ / Tài khoản">
            <Select options={funds} placeholder="Chọn quỹ" allowClear />
          </Form.Item>
          <Form.Item name="method" label="Phương thức">
            <Select options={METHOD_OPTIONS} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

const TAB_ITEMS = [
  { key: 'funds', label: 'Quỹ & Tài khoản', children: <FundsTab /> },
  { key: 'receipts', label: 'Phiếu thu / chi', children: <ReceiptsTab /> },
];

export default function CashManagement() {
  return (
    <div>
      <PageHeader title="Quản lý thu chi" />
      <Tabs defaultActiveKey="funds" items={TAB_ITEMS} />
    </div>
  );
}
