import { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { productsApi } from '@api/tenant.api';

export default function Products() {
  const { fetch, loading, data, pagination, onTableChange } = usePagination(productsApi.list);
  const { execute: create, loading: creating } = useApi(productsApi.create, { successMessage: 'Product created', onSuccess: () => { setOpen(false); fetch(); } });
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'SKU', dataIndex: 'sku' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Cost', dataIndex: 'costPrice', render: (v) => `$${v}` },
    { title: 'Price', dataIndex: 'sellingPrice', render: (v) => `$${v}` },
    { title: 'Stock', dataIndex: 'stockQuantity' },
    { title: 'Active', dataIndex: 'isActive', render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
  ];

  return (
    <div>
      <PageHeader title="Products" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Add Product</Button>} />
      <DataTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onChange={onTableChange} />

      <Modal title="Add Product" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={creating}>
        <Form form={form} onFinish={create} layout="vertical">
          <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="costPrice" label="Cost Price" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="sellingPrice" label="Selling Price" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="unit" label="Unit"><Input placeholder="pcs, kg, box..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
