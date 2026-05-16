import { memo } from 'react';
import { Avatar, Typography } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';

const COLORS = {
  userBg: '#1677ff',
  userText: '#fff',
  assistantBg: '#f5f5f5',
  assistantText: '#000',
};

function MessageBubbleInner({ message, isStreaming }) {
  const isUser = message.role === 'user';
  const isThinking = isStreaming && !message.content && !message.toolCalls?.length;
  const isProcessing = isStreaming && !message.content && message.toolCalls?.some((tc) => tc.status === 'running');

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        size={32}
        style={{ flexShrink: 0, background: isUser ? COLORS.userBg : '#52c41a' }}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
      />
      <div style={{ maxWidth: 'calc(100% - 50px)', minWidth: 0 }}>
        <div
          style={{
            background: isUser ? COLORS.userBg : COLORS.assistantBg,
            color: isUser ? COLORS.userText : COLORS.assistantText,
            padding: '8px 12px',
            borderRadius: 12,
            borderTopRightRadius: isUser ? 4 : 12,
            borderTopLeftRadius: isUser ? 12 : 4,
            wordBreak: 'break-word',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {isUser ? (
            <Typography.Text style={{ color: COLORS.userText, whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography.Text>
          ) : message.content ? (
            <div className="chatbot-markdown">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (isThinking || isProcessing) ? (
            <Typography.Text type="secondary" style={{ fontStyle: 'italic' }}>
              Đang xử lý…
            </Typography.Text>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubbleInner);
