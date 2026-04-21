import { useEffect, useState } from 'react';
import { Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import DataTable from '@shared/components/DataTable';
import { usePagination, useApi } from '@shared/hooks/useApi';
import { categoriesApi } from '@api/tenant.api';

export default function Categories() {
  const { fetch, loading, data } = usePagination(categoriesApi.list);
  const { execute: create, loading: creating } = useApi(categoriesApi.create, { successMessage: 'Category created', onSuccess: () => { setOpen(false); fetch(); } });
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { fetch(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Products', dataIndex: 'productCount', render: (v) => v ?? 0 },
  ];

  return (
    <div>
      <PageHeader title="Categories" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Add Category</Button>} />
      <DataTable columns={columns} dataSource={data} loading={loading} />
      <Modal title="Add Category" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={creating}>
        <Form form={form} onFinish={create} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
