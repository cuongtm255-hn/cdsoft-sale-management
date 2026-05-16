import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Divider, Form, Input, InputNumber, Row, Select,
  Space, Spin, Switch, Tabs,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { customersApi, suppliersApi } from '@api/tenant.api';

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEditing = Boolean(id);

  const [form] = Form.useForm();
  const [loadingData, setLoadingData] = useState(isEditing);
  const [isCustomer, setIsCustomer] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const { execute: createSupplier, loading: creating } = useApi(suppliersApi.create, {
    successMessage: t('supplierForm.createSuccess'),
    onSuccess: (s) => navigate(`/tenant/suppliers/${s.id}`),
  });

  const { execute: updateSupplier, loading: updating } = useApi(
    (data) => suppliersApi.update(id, data),
    {
      successMessage: t('supplierForm.updateSuccess'),
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
      label: t('supplierForm.generalInfo'),
      children: (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label={t('supplierForm.code')} extra={t('supplierForm.autoCode')}>
                <Input placeholder="NCC-0001" disabled={isEditing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label={t('suppliers.name')} rules={[{ required: true, min: 2 }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxCode" label={t('suppliers.taxCode')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label={t('supplierForm.phone')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label={t('supplierForm.email')} rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label={t('supplierForm.contactPerson')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('supplierForm.address')}</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="street" label={t('supplierForm.street')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="district" label={t('supplierForm.district')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="city" label={t('supplierForm.city')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>{t('supplierForm.customerLink')}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="isCustomer" label={t('supplierForm.isCustomerLabel')} valuePropName="checked">
                <Switch onChange={(v) => { setIsCustomer(v); if (!v) form.setFieldValue('customerId', undefined); }} />
              </Form.Item>
            </Col>
            {isCustomer && (
              <Col span={16}>
                <Form.Item
                  name="customerId"
                  label={t('supplierForm.linkedCustomer')}
                  rules={[{ required: true, message: t('supplierForm.linkedCustomerRequired') }]}
                >
                  <Select
                    showSearch
                    options={customerOptions}
                    onSearch={setCustomerSearch}
                    filterOption={false}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Divider orientation="left" plain>{t('common.note')}</Divider>
          <Form.Item name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'bank',
      label: t('supplierForm.bankAccountsTab'),
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
                      <Form.Item {...restField} name={[name, 'bankName']} label={t('supplierForm.bankName')}>
                        <Input placeholder="Vietcombank" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'accountNumber']} label={t('supplierForm.accountNumber')}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'accountName']} label={t('supplierForm.accountName')}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...restField} name={[name, 'branch']} label={t('supplierForm.branch')}>
                        <Input />
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
                {t('supplierForm.addBankAccount')}
              </Button>
            </>
          )}
        </Form.List>
      ),
    },
    {
      key: 'debt',
      label: t('supplierForm.debtSettings'),
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="paymentTermDays" label={t('supplierForm.paymentTermLabel')} initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="discountTerms" label={t('supplierForm.discountTerms')}>
              <Input.TextArea rows={3} />
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
            {isEditing ? t('supplierForm.editTitle') : t('supplierForm.createTitle')}
          </Space>
        }
      />

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs items={tabItems} />
          <Divider />
          <Space>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              {isEditing ? t('supplierForm.saveChanges') : t('supplierForm.createBtn')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
