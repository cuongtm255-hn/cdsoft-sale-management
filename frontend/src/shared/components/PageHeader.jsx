import { Typography, Space, Grid } from 'antd';

const { useBreakpoint } = Grid;

export default function PageHeader({ title, subtitle, extra }) {
  const screens = useBreakpoint();
  const isMobile = screens.md === false;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'flex-start',
        gap: isMobile ? 8 : 0,
        marginBottom: isMobile ? 16 : 24,
      }}
    >
      <div>
        <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>{title}</Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra && (
        <Space wrap size="small">
          {extra}
        </Space>
      )}
    </div>
  );
}
