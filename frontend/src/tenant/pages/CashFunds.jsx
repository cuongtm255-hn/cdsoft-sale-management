import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { cashApi } from '@api/tenant.api';

const fmt = (v) => `${Number(v ?? 0).toLocaleString('vi-VN')}₫`;

export default function CashFunds() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(() => {
    setLoading(true);
    cashApi.listAllFunds()
      .then((res) => setData(res.data?.data ?? res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue({ name: record.name, currency: record.currency });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editRecord) {
        await cashApi.updateFund(editRecord.id, { name: values.name, currency: values.currency });
        message.success(t('cashFunds.updateSuccess'));
      } else {
        await cashApi.createFund({ name: values.name, currency: values.currency, balance: values.balance ?? 0 });
        message.success(t('cashFunds.createSuccess'));
      }
      setModalOpen(false);
      load();
    } catch {
      message.error(editRecord ? t('cashFunds.updateFailed') : t('cashFunds.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (record) => {
    try {
      await cashApi.updateFund(record.id, { isActive: !record.isActive });
      message.success(t('cashFunds.toggleSuccess'));
      load();
    } catch {
      message.error(t('cashFunds.toggleFailed'));
    }
  };

  const columns = [
    {
      title: t('cashFunds.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('finance.balance'),
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (v) => fmt(v),
    },
    {
      title: t('cashFunds.currency'),
      dataIndex: 'currency',
      key: 'currency',
      width: 90,
    },
    {
      title: t('common.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (v) => (
        <Tag color={v ? 'green' : 'default'}>
          {v ? t('finance.activeStatus') : t('finance.inactiveStatus')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          <Button size="small" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
          <Popconfirm
            title={row.isActive ? t('common.deactivate') : t('common.activate')}
            onConfirm={() => handleToggleActive(row)}
          >
            <Button size="small" danger={row.isActive}>
              {row.isActive ? t('common.deactivate') : t('common.activate')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('cashFunds.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('cashFunds.createBtn')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        title={editRecord ? t('cashFunds.editTitle') : t('cashFunds.createTitle')}
        destroyOnHidden
        width={440}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('cashFunds.name')}
            rules={[{ required: true, message: t('cashFunds.nameRequired') }]}
          >
            <Input placeholder={t('cashFunds.namePlaceholder')} />
          </Form.Item>
          {!editRecord && (
            <Form.Item name="balance" label={t('cashFunds.openingBalance')}>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => v.replace(/,/g, '')}
                addonAfter="₫"
              />
            </Form.Item>
          )}
          <Form.Item name="currency" label={t('cashFunds.currency')} initialValue="VND">
            <Input placeholder="VND" />
          </Form.Item>
          <Space>
            <Button onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editRecord ? t('common.update') : t('common.create')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
