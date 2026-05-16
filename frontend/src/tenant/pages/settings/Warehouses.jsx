import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageHeader from '@shared/components/PageHeader';
import { warehousesApi } from '@api/tenant.api';

export default function Warehouses() {
  const { t } = useTranslation();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form]                = Form.useForm();

  const load = () => {
    setLoading(true);
    warehousesApi.list()
      .then((res) => setData(res.data?.data ?? res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit   = (row) => { setEditing(row); form.setFieldsValue(row); setOpen(true); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await warehousesApi.update(editing.id, values);
        message.success(t('warehouses.updateSuccess'));
      } else {
        await warehousesApi.create(values);
        message.success(t('warehouses.createSuccess'));
      }
      setOpen(false);
      load();
    } catch {
      message.error(t('warehouses.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: t('warehouses.name'),    dataIndex: 'name',    key: 'name' },
    { title: t('warehouses.address'), dataIndex: 'address', key: 'address', render: (v) => v ?? '—' },
    {
      title: t('common.status'), dataIndex: 'isActive', key: 'isActive', width: 120,
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? t('warehouses.active') : t('warehouses.inactive')}</Tag>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, r) => <Button size="small" onClick={() => openEdit(r)}>{t('common.edit')}</Button>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('warehouses.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('warehouses.addWarehouse')}
          </Button>
        }
      />

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: t('warehouses.empty') }}
        />
      </Card>

      <Modal
        title={editing ? t('warehouses.editTitle') : t('warehouses.addTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
          <Form.Item name="name" label={t('warehouses.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('warehouses.address')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="isActive" label={t('warehouses.isActive')} valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
