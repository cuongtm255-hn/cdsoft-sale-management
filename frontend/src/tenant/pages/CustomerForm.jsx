import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form, Input, InputNumber, Button, Card, Select, Row, Col,
  Divider, Space, Spin,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { formatGroupedInput, parseGroupedInput } from '@shared/utils/numberInput';
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
  const { t } = useTranslation();
  const isEditing = Boolean(id);
  const role = tenantUser?.role;
  const canSetCredit = CAN_SET_CREDIT.includes(role);
  const canSetGroup = MANAGER_ROLES.includes(role);

  const GROUP_OPTIONS = [
    { label: t('customers.groupRetail'), value: 'RETAIL' },
    { label: t('customers.groupWholesale'), value: 'WHOLESALE' },
    { label: t('customers.groupAgent'), value: 'AGENT' },
    { label: t('customers.groupVip'), value: 'VIP' },
  ];
  const STAFF_GROUPS = [{ label: t('customers.groupRetail'), value: 'RETAIL' }];

  const [form] = Form.useForm();
  const [loadingData, setLoadingData] = useState(isEditing);
  const [salesReps, setSalesReps] = useState([]);

  const { execute: createCustomer, loading: creating } = useApi(customersApi.create, {
    successMessage: t('customerForm.createSuccess'),
    onSuccess: (c) => navigate(`/tenant/customers/${c.id}`),
  });

  const { execute: updateCustomer, loading: updating } = useApi(
    (data) => customersApi.update(id, data),
    {
      successMessage: t('customerForm.updateSuccess'),
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
            {isEditing ? t('customerForm.editTitle') : t('customerForm.createTitle')}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Divider orientation="left" plain>{t('customerForm.basicInfo')}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label={t('customerForm.code')} extra={t('customerForm.autoCode')}>
                <Input placeholder="KH-0001" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label={t('customerForm.nameOrCompany')} rules={[{ required: true, min: 2 }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxCode" label={t('customerForm.taxCode')}>
                <Input placeholder="0123456789" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label={t('customerForm.phone')}>
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label={t('customerForm.email')} rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('customerForm.creditSection')}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="group" label={t('customerForm.customerGroup')} initialValue="RETAIL">
                <Select
                  options={canSetGroup ? GROUP_OPTIONS : STAFF_GROUPS}
                  disabled={!canSetGroup && isEditing}
                />
              </Form.Item>
            </Col>
            {canSetCredit && (
              <>
                <Col span={8}>
                  <Form.Item name="creditLimit" label={t('customerForm.creditLimit')} initialValue={0}>
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      formatter={formatGroupedInput}
                      parser={parseGroupedInput}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="paymentTermDays" label={t('customerForm.paymentTermDays')} initialValue={0}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col span={8}>
              <Form.Item name="salesRepId" label={t('customerForm.salesRep')}>
                <Select options={salesReps} allowClear showSearch
                  filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('customerForm.addressSection')}</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="street" label={t('customerForm.street')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="district" label={t('customerForm.district')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="city" label={t('customerForm.city')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('customerForm.notesSection')}</Divider>
          <Form.Item name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              {isEditing ? t('customerForm.saveChanges') : t('customerForm.createBtn')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
