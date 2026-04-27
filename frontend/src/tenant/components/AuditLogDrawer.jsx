import { Descriptions, Divider, Drawer, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

const METHOD_COLORS = { POST: 'blue', PUT: 'orange', PATCH: 'gold', DELETE: 'red' };

export default function AuditLogDrawer({ log, onClose }) {
  if (!log) return null;
  const method = log.action?.split(' ')[0] ?? '';

  return (
    <Drawer title="Chi tiết thao tác" open={!!log} onClose={onClose} width={520}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Người thực hiện">
          {log.userName} <Tag>{log.userRole}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Thời gian">
          {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="Hành động">
          <Tag color={METHOD_COLORS[method] ?? 'default'}>{method}</Tag>{' '}
          {log.action?.split(' ').slice(1).join(' ')}
        </Descriptions.Item>
        <Descriptions.Item label="Đối tượng">
          {log.resource}{log.resourceId ? ` · ${log.resourceId}` : ''}
        </Descriptions.Item>
        <Descriptions.Item label="IP">{log.ipAddress ?? '—'}</Descriptions.Item>
      </Descriptions>

      {log.beforeData && (
        <>
          <Divider>Dữ liệu trước</Divider>
          <pre style={{ background: '#fef2f2', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
            {JSON.stringify(log.beforeData, null, 2)}
          </pre>
        </>
      )}
      {log.afterData && (
        <>
          <Divider>Dữ liệu sau</Divider>
          <pre style={{ background: '#f0fdf4', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
            {JSON.stringify(log.afterData, null, 2)}
          </pre>
        </>
      )}
    </Drawer>
  );
}
