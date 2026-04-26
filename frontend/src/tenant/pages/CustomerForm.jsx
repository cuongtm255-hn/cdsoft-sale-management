import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form, Input, InputNumber, Button, Card, Select, Row, Col,
  Divider, Space, Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { useAuth } from '@auth/AuthContext';
import { customersApi, usersApi } from '@api/tenant.api';

const GROUP_OPTIONS = [
  { label: 'Lẻ (Retail)', value: 'RETAIL' },
  { label: 'Buôn sỉ', value: 'WHOLESALE' },
  { label: 'Đại lý', value: 'AGENT' },
  { label: 'VIP', value: 'VIP' },
];

const STAFF_GROUPS = [{ label: 'Lẻ (Retail)', value: 'RETAIL' }];
const MANAGER_ROLES = ['MANAGER', 'TENANT_ADMIN', 'ACCOUNTANT'];
const CAN_SET_CREDIT = ['MANAGER', 'TENANT_ADMIN'];

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantUser } = useAuth();
  const isEditing = Boolean(id);
  const role = tenantUser?.role;
  const canSetCredit = CAN_SET_CREDIT.includes(role);
  const canSetGroup = MANAGER_ROLES.includes(role);

  const [form] = Form.useForm();
  const [loadingData, setLoadingData] = useState(isEditing);
  const [salesReps, setSalesReps] = useState([]);

  const { execute: createCustomer, loading: creating } = useApi(customersApi.create, {
    successMessage: 'Khách hàng đã được tạo',
    onSuccess: (c) => navigate(`/tenant/customers/${c.id}`),
  });

  const { execute: updateCustomer, loading: updating } = useApi(
    (data) => customersApi.update(id, data),
    {
      successMessage: 'Cập nhật thành công',
      onSuccess: () => navigate(`/tenant/customers/${id}`),
    },
  );

  useEffect(() => {
    // Load staff/manager list for sales rep dropdown
    usersApi.list({ limit: 100 }).then((res) => {
      const users = res.data?.data?.data ?? res.data?.data ?? [];
      setSalesReps(
        users
          .filter((u) => ['STAFF', 'MANAGER'].includes(u.role))
          .map((u) => ({ label: u.fullName, value: u.id })),
      );
    });

    if (isEditing) {
      setLoadingData(true);
      customersApi.get(id).then((res) => {
        const c = res.data?.data ?? res.data;
        const addr = c.addresses?.[0];
        form.setFieldsValue({
          code: c.code,
          name: c.name,
          taxCode: c.taxCode,
          phone: c.phone,
          email: c.email,
          group: c.customerGroup,
          creditLimit: c.creditLimit,
          paymentTermDays: c.paymentTermDays,
          salesRepId: c.salesRepId,
          notes: c.notes,
          street: addr?.street,
          district: addr?.district,
          city: addr?.city,
        });
      }).finally(() => setLoadingData(false));
    }
  }, [id]);

  const handleSubmit = (values) => {
    const { street, district, city, group, ...rest } = values;
    const payload = {
      ...rest,
      group,
      address: (street || district || city) ? { street, district, city } : undefined,
    };
    if (isEditing) updateCustomer(payload);
    else createCustomer(payload);
  };

  if (loadingData) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/customers')} />
            {isEditing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Divider orientation="left" plain>Thông tin cơ bản</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã khách hàng" extra="Để trống để tự động tạo">
                <Input placeholder="KH-0001" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên KH / Công ty" rules={[{ required: true, min: 2 }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxCode" label="Mã số thuế">
                <Input placeholder="0123456789" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Phân loại & Tín dụng</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="group" label="Nhóm khách hàng" initialValue="RETAIL">
                <Select
                  options={canSetGroup ? GROUP_OPTIONS : STAFF_GROUPS}
                  disabled={!canSetGroup && isEditing}
                />
              </Form.Item>
            </Col>
            {canSetCredit && (
              <>
                <Col span={8}>
                  <Form.Item name="creditLimit" label="Hạn mức tín dụng (₫)" initialValue={0}>
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(v) => v.replace(/,/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="paymentTermDays" label="Thời hạn nợ (ngày)" initialValue={0}>
                    <InputNumber min={0} style={{ width: '100%' }} addonAfter="ngày" />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col span={8}>
              <Form.Item name="salesRepId" label="NV phụ trách">
                <Select options={salesReps} allowClear placeholder="Chọn nhân viên" showSearch
                  filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Địa chỉ</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="street" label="Đường / Số nhà">
                <Input placeholder="123 Nguyễn Huệ" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="district" label="Quận / Huyện">
                <Input placeholder="Quận 1" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="city" label="Tỉnh / Thành phố">
                <Input placeholder="Hồ Chí Minh" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Ghi chú</Divider>
          <Form.Item name="notes">
            <Input.TextArea rows={3} placeholder="Ghi chú nội bộ về khách hàng..." />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              {isEditing ? 'Lưu thay đổi' : 'Tạo khách hàng'}
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
