import { Card, Statistic, Tag, Tooltip } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const fmt = (value) => `${Number(value ?? 0).toLocaleString('vi-VN')}₫`;

export default function CashFundCard({ fund, onReceipt, onDisbursement }) {
  const { t } = useTranslation();

  const tooltipContent = (
    <div style={{ minWidth: 180 }}>
      <div><strong>{t('finance.cashFundName')}:</strong> {fund.name}</div>
      <div><strong>{t('finance.balance')}:</strong> {fmt(fund.balance)}</div>
      <div><strong>{t('finance.currency')}:</strong> {fund.currency}</div>
      <div><strong>{t('common.status')}:</strong> {fund.isActive ? t('finance.activeStatus') : t('finance.inactiveStatus')}</div>
      <div><strong>{t('common.createdAt')}:</strong> {dayjs(fund.createdAt).format('DD/MM/YYYY')}</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <Card
        title={fund.name}
        extra={<Tag color="green">{fund.currency}</Tag>}
        size="small"
        actions={[
          <span key="receipt" style={{ cursor: 'pointer', color: '#52c41a' }} onClick={() => onReceipt?.(fund)}>
            <PlusOutlined /> {t('finance.receiptAction')}
          </span>,
          <span key="disburse" style={{ cursor: 'pointer', color: '#ff4d4f' }} onClick={() => onDisbursement?.(fund)}>
            <MinusOutlined /> {t('finance.disburseAction')}
          </span>,
        ]}
      >
        <Statistic
          title={t('finance.balance')}
          value={Number(fund.balance ?? 0).toLocaleString('vi-VN')}
          suffix="₫"
          valueStyle={{ color: Number(fund.balance) >= 0 ? '#1677ff' : '#cf1322' }}
        />
      </Card>
    </Tooltip>
  );
}
