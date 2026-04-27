import { Card, Statistic, Tag } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

export default function CashFundCard({ fund, onReceipt, onDisbursement }) {
  return (
    <Card
      title={fund.name}
      extra={<Tag color="green">{fund.currency}</Tag>}
      size="small"
      actions={[
        <span key="receipt" style={{ cursor: 'pointer', color: '#52c41a' }} onClick={onReceipt}>
          <PlusOutlined /> Phiếu thu
        </span>,
        <span key="disburse" style={{ cursor: 'pointer', color: '#ff4d4f' }} onClick={onDisbursement}>
          <MinusOutlined /> Phiếu chi
        </span>,
      ]}
    >
      <Statistic
        title="Số dư"
        value={Number(fund.balance ?? 0).toLocaleString('vi-VN')}
        suffix="₫"
        valueStyle={{ color: Number(fund.balance) >= 0 ? '#1677ff' : '#cf1322' }}
      />
    </Card>
  );
}
