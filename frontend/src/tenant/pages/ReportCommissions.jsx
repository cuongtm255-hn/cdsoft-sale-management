import { useEffect, useState } from 'react';
import {
  Button, Card, Col, Descriptions, Divider, Form, InputNumber, Row,
  Select, Space, Spin, Table, Tag, Typography, message, Modal,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import { reportsApi } from '@api/tenant.api';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN');
const defaultRange = [dayjs().startOf('month'), dayjs()];

function ConfigModal({ open, onClose, onSaved }) {
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [rules, setRules]     = useState([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    reportsApi.getCommissionConfig()
      .then((res) => {
        const cfg = res.data?.data ?? res.data;
        form.setFieldsValue({ type: cfg.type });
        setRules(cfg.rules ?? []);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await reportsApi.updateCommissionConfig({ ...values, rules });
      message.success('Đã lưu cấu hình hoa hồng');
      onSaved?.();
      onClose();
    } catch { message.error('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  const updateRule = (i, field, val) =>
    setRules((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <Modal
      open={open} onCancel={onClose} onOk={save} okText="Lưu" confirmLoading={saving}
      title="Cấu hình hoa hồng" width={520} destroyOnClose
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="type" label="Loại tính hoa hồng" rules={[{ required: true }]}>
            <Select options={[
              { label: '% Doanh thu', value: 'REVENUE_PERCENT' },
              { label: '% Lợi nhuận', value: 'PROFIT_PERCENT' },
            ]} />
          </Form.Item>
        </Form>
        <Divider>Bảng bậc hoa hồng</Divider>
        {rules.map((r, i) => (
          <Row key={i} gutter={8} style={{ marginBottom: 8 }} align="middle">
            <Col span={10}>
              <InputNumber
                prefix="≥"
                value={r.minRevenue}
                onChange={(v) => updateRule(i, 'minRevenue', v ?? 0)}
                style={{ width: '100%' }}
                formatter={(v) => Number(v).toLocaleString('vi-VN')}
                addonAfter="₫"
                disabled={i === 0}
              />
            </Col>
            <Col span={8}>
              <InputNumber
                value={r.rate}
                onChange={(v) => updateRule(i, 'rate', v ?? 0)}
                min={0} max={100} step={0.1}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Col>
            <Col span={6}>
              <Button
                danger size="small" disabled={i === 0}
                onClick={() => setRules((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Xóa
              </Button>
            </Col>
          </Row>
        ))}
        <Button
          size="small" icon={<PlusOutlined />}
          onClick={() => setRules((prev) => [...prev, { minRevenue: 0, rate: 0 }])}
          style={{ marginTop: 4 }}
        >
          Thêm bậc
        </Button>
      </Spin>
    </Modal>
  );
}

export default function ReportCommissions() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState([]);
  const [configOpen, setConfigOpen] = useState(false);

  const load = () => {
    setLoading(true);
    reportsApi.commissions({
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to:   dateRange?.[1]?.format('YYYY-MM-DD'),
    }).then((res) => setData((res.data?.data ?? res.data)?.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange]);

  const expandedRowRender = (row) => {
    const cols = [
      { title: 'Mã đơn',    dataIndex: 'orderCode', key: 'orderCode' },
      { title: 'Doanh thu', dataIndex: 'revenue',   key: 'revenue',   align: 'right', render: (v) => fmt(v) + '₫' },
      { title: 'Hoa hồng',  dataIndex: 'commission', key: 'commission', align: 'right',
        render: (v) => <Typography.Text style={{ color: '#389e0d' }}>{fmt(v)}₫</Typography.Text> },
    ];
    return (
      <Table
        columns={cols}
        dataSource={row.details ?? []}
        rowKey="orderId"
        pagination={false}
        size="small"
      />
    );
  };

  const columns = [
    { title: 'Nhân viên',   dataIndex: 'userName',         key: 'userName' },
    { title: 'Doanh thu',   dataIndex: 'totalRevenue',     key: 'totalRevenue',     align: 'right', render: (v) => fmt(v) + '₫', sorter: (a, b) => a.totalRevenue - b.totalRevenue, defaultSortOrder: 'descend' },
    { title: 'Số đơn',      dataIndex: 'totalOrders',      key: 'totalOrders',      align: 'right' },
    { title: 'Tỷ lệ HH',   dataIndex: 'commissionRate',   key: 'commissionRate',   align: 'right', render: (v) => v + '%' },
    {
      title: 'Hoa hồng', dataIndex: 'commissionAmount', key: 'commissionAmount', align: 'right',
      render: (v) => <Typography.Text strong style={{ color: '#389e0d' }}>{fmt(v)}₫</Typography.Text>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bảng hoa hồng"
        extra={
          <Button icon={<SettingOutlined />} onClick={() => setConfigOpen(true)}>
            Cấu hình hoa hồng
          </Button>
        }
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
        </Space>
      </Card>

      <Card size="small">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="userId"
            size="small"
            expandable={{ expandedRowRender }}
            pagination={false}
            locale={{ emptyText: 'Chưa có dữ liệu' }}
          />
        </Spin>
      </Card>

      <ConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
