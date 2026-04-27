import { useEffect, useState } from 'react';
import { Button, Card, Space, Spin, Tabs, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@shared/components/PageHeader';
import ReportDateRangePicker from '@shared/components/ReportDateRangePicker';
import PnLStatement from '@shared/components/PnLStatement';
import { reportsApi } from '@api/tenant.api';

const fmt = (v) => Number(v ?? 0).toLocaleString('vi-VN') + '₫';
const defaultRange = [dayjs().startOf('month'), dayjs()];

function CashflowStatement({ data }) {
  if (!data) return null;
  const { openingBalance, inflows = [], outflows = [], totalInflow, totalOutflow, closingBalance } = data;

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 600 }}>
        <Typography.Text strong>Số dư đầu kỳ</Typography.Text>
        <Typography.Text strong>{fmt(openingBalance)}</Typography.Text>
      </div>

      {inflows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 5px 16px', borderTop: '1px solid #f5f5f5' }}>
          <Typography.Text type="secondary">+ {r.category}</Typography.Text>
          <Typography.Text style={{ color: '#389e0d' }}>{fmt(r.amount)}</Typography.Text>
        </div>
      ))}

      {outflows.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 5px 16px', borderTop: '1px solid #f5f5f5' }}>
          <Typography.Text type="secondary">− {r.category}</Typography.Text>
          <Typography.Text style={{ color: '#cf1322' }}>({fmt(r.amount)})</Typography.Text>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #d9d9d9', marginTop: 4 }}>
        <Typography.Text>Tổng thu</Typography.Text>
        <Typography.Text style={{ color: '#389e0d' }}>{fmt(totalInflow)}</Typography.Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
        <Typography.Text>Tổng chi</Typography.Text>
        <Typography.Text style={{ color: '#cf1322' }}>({fmt(totalOutflow)})</Typography.Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #1677ff', fontWeight: 600 }}>
        <Typography.Text strong>Số dư cuối kỳ</Typography.Text>
        <Typography.Text strong style={{ color: '#1677ff' }}>{fmt(closingBalance)}</Typography.Text>
      </div>
    </div>
  );
}

export default function ReportFinance() {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [loading, setLoading]     = useState(false);
  const [pnl, setPnl]             = useState(null);
  const [cashflow, setCashflow]   = useState(null);

  const load = () => {
    setLoading(true);
    const params = {
      from: dateRange?.[0]?.format('YYYY-MM-DD'),
      to:   dateRange?.[1]?.format('YYYY-MM-DD'),
    };
    Promise.all([
      reportsApi.pnl(params),
      reportsApi.cashflow(params),
    ]).then(([pr, cr]) => {
      setPnl(pr.data?.data ?? pr.data);
      setCashflow(cr.data?.data ?? cr.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateRange]);

  return (
    <div>
      <PageHeader title="Báo cáo Tài chính" />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card size="small">
          <Tabs
            items={[
              {
                key: 'pnl',
                label: 'Kết quả kinh doanh (P&L)',
                children: (
                  <div>
                    <Typography.Title level={5} style={{ marginBottom: 16 }}>
                      KẾT QUẢ KINH DOANH
                      {dateRange?.[0] && dateRange?.[1]
                        ? ` (${dateRange[0].format('DD/MM/YYYY')} — ${dateRange[1].format('DD/MM/YYYY')})`
                        : ''}
                    </Typography.Title>
                    <PnLStatement data={pnl} />
                  </div>
                ),
              },
              {
                key: 'cashflow',
                label: 'Lưu chuyển tiền tệ',
                children: (
                  <div>
                    <Typography.Title level={5} style={{ marginBottom: 16 }}>
                      LƯU CHUYỂN TIỀN TỆ
                      {dateRange?.[0] && dateRange?.[1]
                        ? ` (${dateRange[0].format('DD/MM/YYYY')} — ${dateRange[1].format('DD/MM/YYYY')})`
                        : ''}
                    </Typography.Title>
                    <CashflowStatement data={cashflow} />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
}
