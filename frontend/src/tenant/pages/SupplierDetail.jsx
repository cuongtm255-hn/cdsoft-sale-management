import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Descriptions, Divider, Row, Space, Spin,
  Statistic, Table, Tabs, Tag, Typography,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import { suppliersApi } from '@api/tenant.api';

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + ' ₫';
}

function InfoTab({ supplier }) {
  const addr = supplier.addresses?.[0];
  return (
    <>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Mã NCC">{supplier.code}</Descriptions.Item>
        <Descriptions.Item label="Tên NCC">{supplier.name}</Descriptions.Item>
        <Descriptions.Item label="Mã số thuế">{supplier.taxCode || '—'}</Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">{supplier.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Email">{supplier.email || '—'}</Descriptions.Item>
        <Descriptions.Item label="Người liên hệ">{supplier.contactPerson || '—'}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag color={supplier.isActive ? 'green' : 'default'}>
            {supplier.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Đối tác KH">
          {supplier.isCustomer ? <Tag color="blue">🔄 Vừa là KH</Tag> : '—'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left" plain>Cài đặt nợ</Divider>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Thời hạn thanh toán">
          {supplier.paymentTermDays ?? 0} ngày
        </Descriptions.Item>
        <Descriptions.Item label="Điều khoản chiết khấu">
          {supplier.discountTerms || '—'}
        </Descriptions.Item>
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

      {supplier.bankAccounts?.length > 0 && (
        <>
          <Divider orientation="left" plain>Tài khoản ngân hàng</Divider>
          {supplier.bankAccounts.map((b, i) => (
            <Descriptions key={i} bordered column={2} size="small" style={{ marginBottom: 8 }}>
              <Descriptions.Item label="Ngân hàng">{b.bankName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Số tài khoản">{b.accountNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tên tài khoản">{b.accountName || '—'}</Descriptions.Item>
              <Descriptions.Item label="Chi nhánh">{b.branch || '—'}</Descriptions.Item>
            </Descriptions>
          ))}
        </>
      )}

      {supplier.notes && (
        <>
          <Divider orientation="left" plain>Ghi chú</Divider>
          <Typography.Paragraph style={{ margin: 0 }}>{supplier.notes}</Typography.Paragraph>
        </>
      )}
    </>
  );
}

function PurchaseHistoryTab() {
  const columns = [
    { title: 'Ngày', dataIndex: 'date', key: 'date', width: 110, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Mã phiếu', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Sản phẩm', dataIndex: 'summary', key: 'summary' },
    {
      title: 'Giá trị',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      align: 'right',
      render: (v) => fmtVND(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v) => <Tag>{v ?? '—'}</Tag>,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={[]}
      rowKey="id"
      size="small"
      pagination={{ pageSize: 20 }}
      locale={{ emptyText: 'Chưa có lịch sử nhập hàng. (Sẽ có sau khi triển khai Module 6)' }}
    />
  );
}

function PaymentHistoryTab() {
  const columns = [
    { title: 'Ngày', dataIndex: 'date', key: 'date', width: 110, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Mã chứng từ', dataIndex: 'refCode', key: 'refCode', width: 130 },
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
      dataSource={[]}
      rowKey="id"
      size="small"
      pagination={{ pageSize: 20 }}
      locale={{ emptyText: 'Chưa có lịch sử thanh toán. (Sẽ có sau khi triển khai Module 8)' }}
    />
  );
}

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    suppliersApi.get(id)
      .then((res) => setSupplier(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!supplier) return null;

  const debt = Number(supplier.currentDebt);

  const tabItems = [
    { key: 'info', label: 'Thông tin', children: <InfoTab supplier={supplier} /> },
    { key: 'purchase', label: 'Lịch sử nhập hàng', children: <PurchaseHistoryTab /> },
    { key: 'payment', label: 'Lịch sử thanh toán', children: <PaymentHistoryTab /> },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/suppliers')} />
            <span>{supplier.name}</span>
            <Tag>{supplier.code}</Tag>
            {supplier.isCustomer && <Tag color="blue">🔄 Vừa là KH</Tag>}
          </Space>
        }
        extra={
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/tenant/suppliers/${id}/edit`)}
          >
            Chỉnh sửa
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Nợ phải trả"
              value={debt.toLocaleString('vi-VN')}
              suffix="₫"
              valueStyle={{ color: debt > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Tổng đã nhập" value="—" suffix="₫" />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Hạn thanh toán"
              value={supplier.paymentTermDays ?? 0}
              suffix="ngày"
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
