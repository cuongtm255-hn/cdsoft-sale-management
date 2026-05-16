import { Typography } from 'antd';

const { Text } = Typography;

function fmtVND(v) {
  return Number(v ?? 0).toLocaleString('vi-VN') + '₫';
}

function Row({ label, value, indent = 0, bold = false, negative = false, divider = false }) {
  const color = negative ? '#cf1322' : undefined;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        paddingLeft: indent * 16,
        borderTop: divider ? '1px solid #f0f0f0' : undefined,
        fontWeight: bold ? 600 : 400,
      }}
    >
      <Text style={{ fontWeight: bold ? 600 : 400 }}>{label}</Text>
      <Text style={{ color, fontWeight: bold ? 600 : 400 }}>
        {negative ? `(${fmtVND(Math.abs(value))})` : fmtVND(value)}
      </Text>
    </div>
  );
}

export default function PnLStatement({ data }) {
  if (!data) return null;
  const { revenue, cogs, grossProfit, grossMarginPercent, operatingExpenses, netProfit, netProfitMarginPercent } = data;

  return (
    <div style={{ maxWidth: 560 }}>
      <Row label="I. DOANH THU BÁN HÀNG"         value={revenue?.grossSales}  bold />
      <Row label="Trừ: Hàng trả lại"              value={revenue?.returns}     negative indent={1} />
      <Row label="Trừ: Chiết khấu thương mại"     value={revenue?.discounts}   negative indent={1} />
      <Row label="= DOANH THU THUẦN"              value={revenue?.netRevenue}  bold divider />
      <Row label="II. GIÁ VỐN HÀNG BÁN"          value={cogs}                 negative bold divider />
      <Row
        label={`III. LỢI NHUẬN GỘP  (biên: ${grossMarginPercent}%)`}
        value={grossProfit}
        bold
        divider
      />
      <Row label="IV. CHI PHÍ HOẠT ĐỘNG"         value={operatingExpenses?.total} negative bold divider />
      <Row label="— Chi phí bán hàng"             value={operatingExpenses?.selling}     negative indent={1} />
      <Row label="— Chi phí quản lý chung"        value={operatingExpenses?.adminGeneral} negative indent={1} />
      <Row
        label={`V. LỢI NHUẬN RÒNG  (biên: ${netProfitMarginPercent}%)`}
        value={netProfit}
        bold
        divider
      />
    </div>
  );
}
