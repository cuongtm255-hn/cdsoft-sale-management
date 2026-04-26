import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, DatePicker, Descriptions, Divider, Row, Select,
  Space, Spin, Statistic, Table, Tabs, Tag, Tooltip, Typography,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { customersApi } from '@api/tenant.api';

const { RangePicker } = DatePicker;

const GROUP_COLORS = { RETAIL: 'default', WHOLESALE: 'blue', AGENT: 'purple', VIP: 'gold' };
const GROUP_LABELS = { RETAIL: 'Lẻ', WHOLESALE: 'Buôn sỉ', AGENT: 'Đại lý', VIP: 'VIP' };
const TIER_LABELS = { NONE: '—', SILVER: '🥈 Silver', GOLD: '🥇 Gold', DIAMOND: '💎 Diamond' };

const TX_TYPE_OPTIONS = [
  { label: 'Tất cả', value: undefined },
  { label: '📦 Đơn hàng', value: 'ORDER' },
  { label: '💰 Thanh toán', value: 'PAYMENT' },
  { label: '🔄 Trả hàng', value: 'RETURN' },
];

const TX_ICON = { ORDER: '📦', PAYMENT: '💰', RETURN: '🔄' };
const TX_LABEL = { ORDER: 'Đơn hàng', PAYMENT: 'Thanh toán', RETURN: 'Trả hàng' };

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

function InfoTab({ customer }) {
  const addr = customer.addresses?.[0];
  return (
    <>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Mã khách hàng">{customer.code}</Descriptions.Item>
        <Descriptions.Item label="Tên KH / Công ty">{customer.name}</Descriptions.Item>
        <Descriptions.Item label="Mã số thuế">{customer.taxCode || '—'}</Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{customer.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Email">{customer.email || '—'}</Descriptions.Item>
        <Descriptions.Item label="Nhóm KH">
          <Tag color={GROUP_COLORS[customer.customerGroup]}>{GROUP_LABELS[customer.customerGroup] ?? customer.customerGroup}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left" plain>Tín dụng</Divider>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Hạn mức tín dụng">{fmtVND(customer.creditLimit)}</Descriptions.Item>
        <Descriptions.Item label="Tín dụng còn lại">{fmtVND(customer.availableCredit)}</Descriptions.Item>
        <Descriptions.Item label="Thời hạn nợ">{customer.paymentTermDays ?? 0} ngày</Descriptions.Item>
        <Descriptions.Item label="Hạng thành viên">{TIER_LABELS[customer.memberTier] ?? customer.memberTier}</Descriptions.Item>
      </Descriptions>

      {addr && (
        <>
          <Divider orientation="left" plain>Địa chỉ</Divider>
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Đường / Số nhà">{addr.street || '—'}</Descriptions.Item>
            <Descriptions.Item label="Quận / Huyện">{addr.district || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tỉnh / Thành phố">{addr.city || '—'}</Descriptions.Item>
          </Descriptions>
        </>
      )}

      {customer.notes && (
        <>
          <Divider orientation="left" plain>Ghi chú</Divider>
          <Typography.Paragraph style={{ margin: 0 }}>{customer.notes}</Typography.Paragraph>
        </>
      )}
    </>
  );
}

function TransactionTab({ customerId }) {
  const navigate = useNavigate();
  const [txType, setTxType] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);

  const loadTransactions = () => {
    setLoading(true);
    customersApi.transactions(customerId, {
      type: txType,
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to: dateRange?.[1]?.format('YYYY-MM-DD'),
      limit: 50,
    }).then((res) => {
      const d = res.data?.data ?? res.data;
      setData(d.data ?? []);
      setSummary(d.summary ?? null);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, [txType, dateRange]);

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (v) => <span>{TX_ICON[v] ?? ''} {TX_LABEL[v] ?? v}</span>,
    },
    {
      title: 'Mã chứng từ',
      dataIndex: 'refCode',
      key: 'refCode',
      width: 130,
      render: (v, row) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => row.refPath && navigate(row.refPath)}>
          {v || '—'}
        </Button>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (v, row) => {
        const isDebt = row.type === 'ORDER';
        return (
          <Typography.Text style={{ color: isDebt ? '#cf1322' : '#389e0d', fontWeight: 500 }}>
            {isDebt ? '+' : '-'}{Number(v ?? 0).toLocaleString('vi-VN')} ₫
          </Typography.Text>
        );
      },
    },
    {
      title: 'Số dư nợ',
      dataIndex: 'balance',
      key: 'balance',
      width: 140,
      align: 'right',
      render: (v) => (
        <Typography.Text style={{ color: Number(v) > 0 ? '#cf1322' : 'inherit' }}>
          {Number(v ?? 0).toLocaleString('vi-VN')} ₫
        </Typography.Text>
      ),
    },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          options={TX_TYPE_OPTIONS}
          value={txType}
          onChange={setTxType}
          style={{ width: 160 }}
          placeholder="Loại giao dịch"
        />
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
        />
      </Space>

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Tổng đơn hàng" value={summary.totalOrders} suffix="đơn" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="Tổng mua"
                value={Number(summary.totalPurchased).toLocaleString('vi-VN')}
                suffix="₫"
              />
            </Card>
          </Col>
        </Row>
      )}

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'Chưa có giao dịch nào.' }}
      />
    </>
  );
}

function PaymentTab({ customerId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    setLoading(true);
    customersApi.transactions(customerId, { type: 'PAYMENT', limit: 50 })
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setData(d.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    { title: 'Mã phiếu thu', dataIndex: 'refCode', key: 'refCode', width: 130 },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (v) => (
        <Typography.Text style={{ color: '#389e0d', fontWeight: 500 }}>
          {Number(v ?? 0).toLocaleString('vi-VN')} ₫
        </Typography.Text>
      ),
    },
    { title: 'Phương thức', dataIndex: 'method', key: 'method', width: 130 },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{ pageSize: 20 }}
      locale={{ emptyText: 'Chưa có lịch sử thanh toán.' }}
    />
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    customersApi.get(id)
      .then((res) => setCustomer(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!customer) return null;

  const debt = Number(customer.currentDebt);
  const limit = Number(customer.creditLimit);
  const debtColor = limit > 0 && debt >= limit ? '#cf1322' : debt > 0 ? '#d46b08' : undefined;

  const tabItems = [
    {
      key: 'info',
      label: 'Thông tin',
      children: <InfoTab customer={customer} />,
    },
    {
      key: 'transactions',
      label: 'Lịch sử giao dịch',
      children: <TransactionTab customerId={id} />,
    },
    {
      key: 'payments',
      label: 'Lịch sử thanh toán',
      children: <PaymentTab customerId={id} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/customers')} />
            <span>{customer.name}</span>
            <Tag>{customer.code}</Tag>
            <Tag color={GROUP_COLORS[customer.customerGroup]}>
              {GROUP_LABELS[customer.customerGroup] ?? customer.customerGroup}
            </Tag>
          </Space>
        }
        extra={
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/tenant/customers/${id}/edit`)}
          >
            Chỉnh sửa
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Tổng mua"
              value="—"
              suffix="₫"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Nợ hiện tại"
              value={debt.toLocaleString('vi-VN')}
              suffix="₫"
              valueStyle={{ color: debtColor }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Điểm tích lũy"
              value={Number(customer.loyaltyPoints).toLocaleString()}
              suffix={customer.memberTier !== 'NONE' ? ` (${customer.memberTier})` : ''}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Tín dụng còn lại"
              value={Number(customer.availableCredit ?? 0).toLocaleString('vi-VN')}
              suffix="₫"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
