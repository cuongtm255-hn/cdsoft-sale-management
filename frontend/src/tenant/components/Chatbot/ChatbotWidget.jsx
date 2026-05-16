import { useEffect, useRef, useState } from 'react';
import {
  Drawer, FloatButton, Input, Button, Space, Typography, Alert, Empty, Tooltip,
} from 'antd';
import {
  MessageOutlined, SendOutlined, CloseOutlined, ReloadOutlined, RobotOutlined,
} from '@ant-design/icons';
import { useAuth } from '@auth/AuthContext';
import { TENANT_TOKEN_KEY } from '@api/axios';
import MessageBubble from './MessageBubble';
import { useChatStream } from './useChatStream';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const STARTERS = [
  'Liệt kê 5 sản phẩm tồn kho cao nhất',
  'Xem hoá đơn chưa thanh toán tuần qua',
  'Tổng công nợ phải trả nhà cung cấp ABC',
  'Hướng dẫn tạo đơn bán hàng',
];

export default function ChatbotWidget() {
  const { tenantUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [chatEnabled, setChatEnabled] = useState(null); // null=loading, true/false
  const listRef = useRef(null);
  const { messages, isStreaming, muteInfo, sendMessage, resetConversation, clearMuteInfo } = useChatStream();

  useEffect(() => {
    if (!tenantUser) return;
    const token = localStorage.getItem(TENANT_TOKEN_KEY);
    fetch(`${BASE_URL}/api/tenant/chatbot/status`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
      .then((r) => r.json())
      .then((res) => setChatEnabled(res?.data?.enabled === true))
      .catch(() => setChatEnabled(false));
  }, [tenantUser]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (!tenantUser || chatEnabled !== true) return null;

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming || muteInfo.muted) return;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isGloballyMuted = muteInfo.muted && muteInfo.scope === 'global';
  const isUserMuted = muteInfo.muted && muteInfo.scope === 'user';

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        tooltip="Trợ lý ảo CDSoft"
        onClick={() => setOpen(true)}
        style={{ insetInlineEnd: 24, insetBlockEnd: 24, width: 56, height: 56 }}
        badge={muteInfo.muted ? { dot: true, color: 'red' } : undefined}
      />

      <Drawer
        title={
          <Space>
            <RobotOutlined style={{ color: '#52c41a' }} />
            <span>Trợ lý ảo CDSoft</span>
          </Space>
        }
        placement="right"
        width={420}
        open={open}
        onClose={() => setOpen(false)}
        closeIcon={<CloseOutlined />}
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column' },
          content: { display: 'flex', flexDirection: 'column' },
        }}
        extra={
          <Tooltip title="Bắt đầu cuộc trò chuyện mới">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => {
                resetConversation();
                clearMuteInfo();
              }}
              disabled={isStreaming}
            />
          </Tooltip>
        }
      >
        {isGloballyMuted && (
          <Alert
            type="error"
            showIcon
            banner
            message={muteInfo.message || 'Trợ lý ảo đang tạm ngưng phục vụ.'}
            style={{ borderRadius: 0 }}
          />
        )}

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#fff',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ marginTop: 40 }}>
              <Empty
                image={<RobotOutlined style={{ fontSize: 48, color: '#52c41a' }} />}
                styles={{ image: { height: 60 } }}
                description={
                  <Typography.Text type="secondary">
                    Chào {tenantUser?.email?.split('@')[0] || 'bạn'}! Tôi có thể tra cứu sản phẩm, công nợ, tồn kho và trả lời hướng dẫn sử dụng.
                  </Typography.Text>
                }
              />
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STARTERS.map((s) => (
                  <Button
                    key={s}
                    block
                    size="small"
                    onClick={() => sendMessage(s)}
                    disabled={muteInfo.muted}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                isStreaming={isStreaming && i === messages.length - 1 && m.role === 'assistant'}
              />
            ))
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={
                isGloballyMuted
                  ? 'Trợ lý đang bảo trì…'
                  : isUserMuted
                    ? muteInfo.message || 'Trợ lý đang gặp sự cố tạm thời, quay lại sau nhé…'
                    : 'Nhập câu hỏi… (Enter để gửi, Shift+Enter xuống dòng)'
              }
              disabled={isStreaming || muteInfo.muted}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isStreaming}
              disabled={!input.trim() || muteInfo.muted}
            />
          </Space.Compact>
        </div>
      </Drawer>
    </>
  );
}
