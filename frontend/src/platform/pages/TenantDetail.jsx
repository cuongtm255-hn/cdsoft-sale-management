import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Space, Spin, Tabs, Form, Input, Descriptions, Empty, Table, Modal, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '@shared/components/PageHeader';
import { useApi } from '@shared/hooks/useApi';
import { tenantsApi } from '@api/platform.api';

const statusColor = { ACTIVE: 'green', INACTIVE: 'default', SUSPENDED: 'red' };
const provisionColor = { ACTIVE: 'green', PENDING: 'gold', PROVISIONING: 'blue', FAILED: 'red', SUSPENDED: 'default' };

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [machineForm] = Form.useForm();
  const [tenant, setTenant] = useState(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  
  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [isAddMachineVisible, setIsAddMachineVisible] = useState(false);

  const { execute: updateTenant, loading: saving } = useApi(
    (data) => tenantsApi.update(id, data),
    {
      successMessage: 'Tenant updated',
      onSuccess: (updated) => setTenant(updated),
    },
  );

  const { execute: changeStatus, loading: statusLoading } = useApi(
    (status) => tenantsApi.updateStatus(id, { status }),
    {
      successMessage: 'Status updated',
      onSuccess: (updated) => setTenant(updated),
    },
  );

  const loadMachines = useCallback(() => {
    setLoadingMachines(true);
    tenantsApi.getMachines(id)
      .then(res => setMachines(res.data?.data ?? res.data))
      .catch(() => message.error('Failed to load machines'))
      .finally(() => setLoadingMachines(false));
  }, [id]);

  const load = useCallback(() => {
    setLoadingTenant(true);
    tenantsApi
      .get(id)
      .then((res) => {
        const t = res.data?.data ?? res.data;
        setTenant(t);
        form.setFieldsValue({
          tenantName: t.tenantName,
          companyName: t.companyName,
          contactName: t.contactName,
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          address: t.address,
        });
        
        if (t.isExternalProduct) {
          loadMachines();
        }
      })
      .finally(() => setLoadingTenant(false));
  }, [id, form, loadMachines]);

  useEffect(() => { load(); }, [load]);

  const handleAddMachine = async (values) => {
    try {
      await tenantsApi.addMachine(id, values);
      message.success('Machine added and Active Key generated');
      setIsAddMachineVisible(false);
      machineForm.resetFields();
      loadMachines();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to add machine');
    }
  };

  if (loadingTenant) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (!tenant) return null;

  const statusActions = (
    <Space>
      {tenant.status === 'ACTIVE' && (
        <Button danger loading={statusLoading} onClick={() => changeStatus('SUSPENDED')}>
          Suspend
        </Button>
      )}
      {tenant.status !== 'ACTIVE' && (
        <Button type="primary" loading={statusLoading} onClick={() => changeStatus('ACTIVE')}>
          Activate
        </Button>
      )}
    </Space>
  );

  const infoTab = (
    <Form form={form} layout="vertical" onFinish={updateTenant}>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Tenant Code">
          <strong>{tenant.tenantCode}</strong>
        </Descriptions.Item>
        {tenant.isExternalProduct ? (
          <Descriptions.Item label="Sản phẩm khác">
            <Tag color="blue">{tenant.externalProductName}</Tag>
          </Descriptions.Item>
        ) : (
          <Descriptions.Item label="Provisioning Status">
            <Tag color={provisionColor[tenant.provisioningStatus]}>{tenant.provisioningStatus}</Tag>
          </Descriptions.Item>
        )}
        {!tenant.isExternalProduct && <Descriptions.Item label="DB Host">{tenant.dbHost || '—'}</Descriptions.Item>}
        {!tenant.isExternalProduct && <Descriptions.Item label="DB Name">{tenant.dbName || '—'}</Descriptions.Item>}
        <Descriptions.Item label="Created">{new Date(tenant.createdAt).toLocaleString()}</Descriptions.Item>
      </Descriptions>

      <Form.Item name="tenantName" label="Tenant Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contactName" label="Contact Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contactEmail" label="Contact Email" rules={[{ required: true, type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="contactPhone" label="Contact Phone">
        <Input />
      </Form.Item>
      <Form.Item name="address" label="Address">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );

  const provisionTab = (
    <Empty description="Provisioning log not yet available" style={{ marginTop: 40 }} />
  );

  const machinesTab = (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddMachineVisible(true)}>
          Thêm máy tính
        </Button>
      </div>
      <Table 
        dataSource={machines} 
        rowKey="id" 
        loading={loadingMachines}
        columns={[
          { title: 'Tên máy', dataIndex: 'machineName', key: 'machineName' },
          { title: 'Machine Code', dataIndex: 'machineCode', key: 'machineCode' },
          { 
            title: 'Active Key', 
            dataIndex: 'activeKey', 
            key: 'activeKey',
            render: (text) => <div style={{ maxWidth: 300, wordWrap: 'break-word', fontSize: '12px' }}>{text}</div>
          },
          { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt', render: (d) => new Date(d).toLocaleString() }
        ]}
      />
      <Modal
        title="Thêm máy tính & Tạo Key"
        open={isAddMachineVisible}
        onCancel={() => setIsAddMachineVisible(false)}
        footer={null}
      >
        <Form form={machineForm} layout="vertical" onFinish={handleAddMachine}>
          <Form.Item name="machineName" label="Tên máy tính" rules={[{ required: true }]}>
            <Input placeholder="VD: Máy thu ngân 1" />
          </Form.Item>
          <Form.Item name="machineCode" label="Machine Code" rules={[{ required: true }]}>
            <Input placeholder="Nhập Machine Code từ phần mềm" />
          </Form.Item>
          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsAddMachineVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Tạo Key</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  const tabItems = [
    { key: 'info', label: 'Info', children: infoTab },
  ];

  if (!tenant.isExternalProduct) {
    tabItems.push({ key: 'provision-log', label: 'Provision Log', children: provisionTab });
  } else {
    tabItems.push({ key: 'machines', label: 'Danh sách máy tính', children: machinesTab });
  }

  return (
    <div>
      <PageHeader
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={() => navigate('/platform/tenants')}
            />
            {tenant.tenantName}
            <Tag color={statusColor[tenant.status]}>{tenant.status}</Tag>
          </Space>
        }
        extra={statusActions}
      />
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
