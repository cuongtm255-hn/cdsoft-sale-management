import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select,
  Space, Spin, Switch, Tabs,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { customersApi, suppliersApi } from '@api/tenant.api';

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form] = Form.useForm();
  const [loadingData, setLoadingData] = useState(isEditing);
  const [isCustomer, setIsCustomer] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const { execute: createSupplier, loading: creating } = useApi(suppliersApi.create, {
    successMessage: 'Nhà cung cấp đã được tạo',
    onSuccess: (s) => navigate(`/tenant/suppliers/${s.id}`),
  });

  const { execute: updateSupplier, loading: updating } = useApi(
    (data) => suppliersApi.update(id, data),
    {
      successMessage: 'Cập nhật thành công',
      onSuccess: () => navigate(`/tenant/suppliers/${id}`),
    },
  );

  // Load customers for the isCustomer link dropdown
  useEffect(() => {
    customersApi.list({ search: customerSearch || undefined, limit: 50 })
      .then((res) => {
        const list = res.data?.data?.data ?? res.data?.data ?? [];
        setCustomerOptions(list.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })));
      });
  }, [customerSearch]);

  useEffect(() => {
    if (!isEditing) return;
    setLoadingData(true);
    suppliersApi.get(id).then((res) => {
      const s = res.data?.data ?? res.data;
      const addr = s.addresses?.[0];
      setIsCustomer(Boolean(s.isCustomer));
      form.setFieldsValue({
        code: s.code,
        name: s.name,
        taxCode: s.taxCode,
        phone: s.phone,
        email: s.email,
        contactPerson: s.contactPerson,
        notes: s.notes,
        isCustomer: s.isCustomer,
        customerId: s.customerId,
        paymentTermDays: s.paymentTermDays ?? 0,
        discountTerms: s.discountTerms,
        street: addr?.street,
        district: addr?.district,
        city: addr?.city,
        bankAccounts: s.bankAccounts ?? [],
      });
    }).finally(() => setLoadingData(false));
  }, [id]);

  const handleSubmit = (values) => {
    const { street, district, city, bankAccounts, ...rest } = values;
    const payload = {
      ...rest,
      address: (street || district || city) ? { street, district, city } : undefined,
      bankAccounts: bankAccounts ?? [],
    };
    if (isEditing) updateSupplier(payload);
    else createSupplier(payload);
  };

  if (loadingData) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  const tabItems = [
    {
      key: 'info',
      label: 'Thông tin chung',
      children: (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã NCC" extra="Để trống để tự động tạo">
                <Input placeholder="NCC-0001" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, min: 2 }]}>
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
                <Input placeholder="028-3812-3456" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="Người liên hệ">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Địa chỉ</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="street" label="Đường / Số nhà">
                <Input placeholder="456 Lê Lợi" />
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

          <Divider orientation="left" plain>Liên kết khách hàng</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="isCustomer" label="Vừa là khách hàng?" valuePropName="checked">
                <Switch onChange={(v) => { setIsCustomer(v); if (!v) form.setFieldValue('customerId', undefined); }} />
              </Form.Item>
            </Col>
            {isCustomer && (
              <Col span={16}>
                <Form.Item
                  name="customerId"
                  label="Khách hàng liên kết"
                  rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
                >
                  <Select
                    showSearch
                    options={customerOptions}
                    onSearch={setCustomerSearch}
                    filterOption={false}
                    placeholder="Tìm theo mã / tên KH"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Divider orientation="left" plain>Ghi chú</Divider>
          <Form.Item name="notes">
            <Input.TextArea rows={3} placeholder="Ghi chú nội bộ về nhà cung cấp..." />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'bank',
      label: 'Tài khoản ngân hàng',
      children: (
        <Form.List name="bankAccounts">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  style={{ marginBottom: 12 }}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'bankName']} label="Ngân hàng">
                        <Input placeholder="Vietcombank" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'accountNumber']} label="Số tài khoản">
                        <Input placeholder="1234567890" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'accountName']} label="Tên tài khoản">
                        <Input placeholder="CONG TY CP XYZ" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'branch']} label="Chi nhánh">
                        <Input placeholder="TP HCM" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => add({})}
              >
                Thêm tài khoản ngân hàng
              </Button>
            </>
          )}
        </Form.List>
      ),
    },
    {
      key: 'debt',
      label: 'Cài đặt nợ',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="paymentTermDays" label="Thời hạn thanh toán (ngày)" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="ngày" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="discountTerms" label="Điều khoản chiết khấu">
              <Input.TextArea rows={3} placeholder="VD: 2% nếu thanh toán trong 10 ngày" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/tenant/suppliers')} />
            {isEditing ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs items={tabItems} />
          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              {isEditing ? 'Lưu thay đổi' : 'Tạo nhà cung cấp'}
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
