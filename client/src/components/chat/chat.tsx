import './chat.css';
import { Attachments, Bubble, Conversations, Prompts, Sender, Suggestion, Welcome, useXAgent, useXChat } from '@ant-design/x';
import { createStyles } from 'antd-style';
import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  BulbOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  EllipsisOutlined,
  FireOutlined,
  HeartOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReadOutlined,
  ShareAltOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Badge, Button, type GetProp, Space } from 'antd';
import MarkdownIt from 'markdown-it';
import { useConnection } from '@/lib/hooks/useConnection';
import { useAppContext } from '@/context';
import {
  CallToolResultSchema,
  CreateMessageRequest,
  CreateMessageResult,
  Root,
  ServerNotification,
} from '@modelcontextprotocol/sdk/types.js';
import { StdErrNotification } from '@/lib/notificationTypes';
import { toast } from 'react-toastify';
import { useMCPAConcepts } from '@/lib/hooks/useMCPAConcepts';
import { useMCPServerParameter } from '@/lib/hooks/useMCPServerParameter';
import { useSyncReference } from '@/lib/hooks/useSyncReference';
import { Chunk2MessageResult, useChunk } from '@/lib/hooks/useChunk';
import { useRequestParameter } from '@/lib/hooks/useRequestParameter';
import { MessageInfo } from '@ant-design/x/es/use-x-chat';

type PendingRequest = {
  id: number;
  request: CreateMessageRequest;
};
type MessageRecord = {
  role: 'user' | 'system';
  content: string;
};
type SystemPrompts = {
  name: string;
  description: string;
  messages: MessageRecord[];
};
type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;
const renderTitle = (icon: React.ReactElement, title: string) => (
  <Space align="start">
    {icon}
    <span>{title}</span>
  </Space>
);

const suggestions: SuggestionItems = [{ label: '创建表', value: 'createTable' }];

const defaultConversationsItems = [{ key: uuidv4(), label: `New Conversation` }];

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 1000px;
      height: 722px;
      border-radius: ${token.borderRadius}px;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;

      .ant-prompts {
        color: ${token.colorText};
      }
    `,
    menu: css`
      background: ${token.colorBgLayout}80;
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
    `,
    conversations: css`
      padding: 0 12px;
      flex: 1;
      overflow-y: auto;
    `,
    chat: css`
      height: 100%;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;
    `,
    messages: css`
      flex: 1;
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
    logo: css`
      display: flex;
      height: 72px;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;

      img {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      span {
        display: inline-block;
        margin: 0 8px;
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    addBtn: css`
      background: #1677ff0f;
      border: 1px solid #1677ff34;
      width: calc(100% - 24px);
      margin: 0 12px 24px 12px;
    `,
  };
});

const placeholderPromptsItems: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    label: renderTitle(<FireOutlined style={{ color: '#FF4D4F' }} />, 'Hot Topics'),
    description: 'What are you interested in?',
    children: [
      {
        key: '1-1',
        description: `What's new in X?`,
      },
      {
        key: '1-2',
        description: `What's AGI?`,
      },
      {
        key: '1-3',
        description: `Where is the doc?`,
      },
    ],
  },
  {
    key: '2',
    label: renderTitle(<ReadOutlined style={{ color: '#1890FF' }} />, 'Design Guide'),
    description: 'How to design a good product?',
    children: [
      {
        key: '2-1',
        icon: <HeartOutlined />,
        description: `Know the well`,
      },
      {
        key: '2-2',
        icon: <SmileOutlined />,
        description: `Set the AI role`,
      },
      {
        key: '2-3',
        icon: <CommentOutlined />,
        description: `Express the feeling`,
      },
    ],
  },
];

const senderPromptsItems: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    description: 'Hot Topics',
    icon: <FireOutlined style={{ color: '#FF4D4F' }} />,
  },
  {
    key: '2',
    description: 'Design Guide',
    icon: <ReadOutlined style={{ color: '#1890FF' }} />,
  },
];

const md = MarkdownIt({ html: true, breaks: true });
export const Independent: React.FC = () => {
  const { mcpGetConfig, PROXY_SERVER_URL, request, model } = useAppContext();
  const { styles } = useStyle();
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [stdErrNotifications, setStdErrNotifications] = useState<StdErrNotification[]>([]);
  const [roots] = useState<Root[]>([]);
  const [env, setEnv] = useState<Record<string, string>>({});
  const nextRequestId = useRef(0);
  const rootsRef = useSyncReference(roots);
  const messagesMemo = useSyncReference<MessageInfo<string>[]>([]);
  const SystemPromptsParameter = useRef<MessageRecord[]>([]);
  const { bearerToken, setArgs, setCommand, command, args, sseUrl, transportType } = useMCPServerParameter();
  const [, setPendingSampleRequests] = useState<
    Array<
      PendingRequest & {
        resolve: (result: CreateMessageResult) => void;
        reject: (error: Error) => void;
      }
    >
  >([]);

  const {
    connectionStatus,
    makeRequest: makeConnectionRequest,
    connect: connectMcpServer,
  } = useConnection({
    transportType,
    command,
    args,
    sseUrl,
    env,
    bearerToken,
    proxyServerUrl: PROXY_SERVER_URL,
    onNotification: (notification) => {
      setNotifications((prev) => [...prev, notification as ServerNotification]);
    },
    onStdErrNotification: (notification) => {
      setStdErrNotifications((prev) => [...prev, notification as StdErrNotification]);
    },
    onPendingRequest: (request, resolve, reject) => {
      setPendingSampleRequests((prev) => [...prev, { id: nextRequestId.current++, request, resolve, reject }]);
    },
    getRoots: () => rootsRef.current,
  });

  const { listTools, tools: _tools, callTool, prompts: _prompts } = useMCPAConcepts({ makeConnectionRequest });
  const { chunk2Message, parseToolCallArguments } = useChunk();
  const tools = useSyncReference(_tools);
  const prompts = useSyncReference(_prompts);
  const { getParameter } = useRequestParameter();
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts[]>([]);

  // ==================== State ====================
  const [headerOpen, setHeaderOpen] = React.useState(false);

  const [content, setContent] = React.useState('');

  const [conversationsItems, setConversationsItems] = React.useState(defaultConversationsItems);

  const [activeKey, setActiveKey] = React.useState(defaultConversationsItems[0].key);

  const [attachedFiles, setAttachedFiles] = React.useState<GetProp<typeof Attachments, 'items'>>([]);

  const { interimTranscript, finalTranscript, resetTranscript, listening } = useSpeechRecognition();

  const callTools = useSyncReference(async (toolCalls: Chunk2MessageResult['toolCalls']) => {
    const toolResults = await Promise.all(toolCalls.map((tool) => callTool(tool.name, tool.arguments)));
    return toolResults.reduce(
      (prev, toolResult) => {
        if ('content' in toolResult) {
          const parsedResult = CallToolResultSchema.safeParse(toolResult);
          if (parsedResult.success) {
            prev.prompts = (parsedResult.data.content[0]?._meta as any)?.prompts;
            prev.message += parsedResult.data.content.map((content) => content.text).join('\n');
          } else {
            console.error('Error parsing tool result:', parsedResult.error);
          }
        }
        return prev;
      },
      { message: '' } as { message: string; prompts?: SystemPrompts[] },
    );
  });
  // ==================== Runtime ====================
  const [agent] = useXAgent({
    request: async ({ message }, { onUpdate, onSuccess, onError }) => {
      const result: Chunk2MessageResult = { message: '', toolCalls: [] };
      const msgs = [...SystemPromptsParameter.current, { role: 'user', content: message }];
      SystemPromptsParameter.current = [];
      request.create(
        {
          messages: msgs,
          ...getParameter(model, { tools: tools.current, prompts: prompts.current }),
        },
        {
          onSuccess: async () => {
            const toolResults = await callTools.current(parseToolCallArguments(result.toolCalls));
            onSuccess(result.message + toolResults.message);
            if (toolResults.prompts) setSystemPrompts(toolResults.prompts);
          },
          onError: (error) => {
            onError(error);
          },
          onUpdate: (chunk) => {
            chunk2Message(model, chunk, result);
            onUpdate(result.message);
          },
        },
        new TransformStream<string, string>({
          transform(chunk, controller) {
            controller.enqueue(chunk);
          },
        }),
      );
    },
  });
  const { onRequest, messages, setMessages } = useXChat({ agent });
  messagesMemo.current = messages;

  const speechRecognition = (nextRecording: boolean) => {
    if (nextRecording) {
      SpeechRecognition.startListening({ continuous: true, language: 'zh-CN' });
    } else {
      SpeechRecognition.stopListening();
      resetTranscript();
    }
  };

  // ==================== Event ====================
  const onSubmit = (nextContent: string) => {
    if (!nextContent) return;
    onRequest(nextContent);
    speechRecognition(false);
    setContent('');
  };

  const onPromptsItemClick: GetProp<typeof Prompts, 'onItemClick'> = (info) => {
    const systemMessages = (info.data as any).messages;
    if (systemMessages) {
      SystemPromptsParameter.current = systemMessages;
    }
    onRequest(info.data.description as string);
  };

  const onAddConversation = () => {
    setConversationsItems([
      ...conversationsItems,
      {
        key: uuidv4(),
        label: `New Conversation ${conversationsItems.length}`,
      },
    ]);
    setActiveKey(`${conversationsItems.length}`);
  };

  const onConversationClick: GetProp<typeof Conversations, 'onActiveChange'> = (key) => {
    setActiveKey(key);
  };

  const handleFileChange: GetProp<typeof Attachments, 'onChange'> = (info) => setAttachedFiles(info.fileList);

  // ==================== Nodes ====================
  const placeholderNode = (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="Hello, I'm Ant Design X"
        description="Base on Ant Design, AGI product interface solution, create a better intelligent vision~"
        extra={
          <Space>
            <Button icon={<ShareAltOutlined />} />
            <Button icon={<EllipsisOutlined />} />
          </Space>
        }
      />
      <Prompts
        title="Do you want?"
        items={placeholderPromptsItems}
        styles={{ list: { width: '100%' }, item: { flex: 1 } }}
        onItemClick={onPromptsItemClick}
      />
    </Space>
  );

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map((params) => {
    const { id, message, status } = params;
    if (typeof id === 'string' && id.startsWith('prompts-')) {
      return {
        key: id,
        role: 'prompts',
        content: (params as any).content,
      };
    }
    return {
      key: id,
      // loading: status === 'loading',
      role: status === 'local' ? 'local' : 'ai',
      content: message,
    };
  });

  const attachmentsNode = (
    <Badge dot={attachedFiles.length > 0 && !headerOpen}>
      <Button type="text" icon={<PaperClipOutlined />} onClick={() => setHeaderOpen(!headerOpen)} />
    </Badge>
  );

  const senderHeader = (
    <Sender.Header
      title="Attachments"
      open={headerOpen}
      onOpenChange={setHeaderOpen}
      styles={{
        content: {
          padding: 0,
        },
      }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles}
        onChange={handleFileChange}
        placeholder={(type) =>
          type === 'drop'
            ? { title: 'Drop file here' }
            : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload',
              }
        }
      />
    </Sender.Header>
  );

  const roles: GetProp<typeof Bubble.List, 'roles'> = {
    ai: {
      placement: 'start',
      typing: { step: 5, interval: 20 },
      styles: {
        content: {
          borderRadius: 16,
        },
      },
      messageRender: (content) => <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />,
    },
    local: {
      placement: 'end',
      variant: 'shadow',
    },
    prompts: {
      placement: 'start',
      // avatar: { icon: <UserOutlined />, style: { visibility: 'hidden' } },
      variant: 'borderless',
      messageRender: (items) => <Prompts onItemClick={onPromptsItemClick} items={items as any} />,
    },
  };

  const logoNode = (
    <div className={styles.logo}>
      <img
        src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
        draggable={false}
        alt="logo"
      />
      <span>Ant Design X</span>
    </div>
  );
  useEffect(() => {
    if (connectionStatus === 'connected') {
      listTools();
      // listPrompts();
    }
  }, [connectionStatus]);
  useEffect(() => {
    if (command) {
      if (sseUrl && transportType === 'stdio') {
        toast.success('Successfully authenticated with OAuth');
      }
      connectMcpServer();
    }
  }, [command]);

  useEffect(() => {
    if (stdErrNotifications.length > 0) {
      const errorMessage = stdErrNotifications.reduce((prev, notification) => {
        return prev + notification.params.content;
      }, '');
      toast.error(errorMessage);
    }
  }, [stdErrNotifications]);

  useEffect(() => {
    if (notifications.length > 0) {
      const historyMessage = notifications.reduce((prev, notification) => {
        return prev + notification.method + '\n';
      }, '');
      console.info(historyMessage);
    }
  }, [notifications]);

  useEffect(() => {
    if (activeKey !== undefined) setMessages([]);
  }, [activeKey]);

  useEffect(() => {
    if (systemPrompts.length > 0) {
      const promptItems: GetProp<typeof Prompts, 'items'> = systemPrompts.map((prompts) => ({
        key: prompts.name,
        description: prompts.description,
        messages: prompts.messages,
        icon: <BulbOutlined style={{ color: '#FFD700' }} />,
      }));
      setMessages((prev) => [
        ...prev,
        {
          id: `prompts-${uuidv4()}`,
          status: 'success',
          message: '',
          role: 'prompts',
          content: promptItems,
        },
      ]);
      setSystemPrompts([]);
    }
  }, [systemPrompts]);

  useEffect(() => {
    if (finalTranscript !== '') setContent(finalTranscript);
  }, [interimTranscript, finalTranscript]);

  useEffect(() => {
    mcpGetConfig()
      .then((data) => {
        setEnv(data.defaultEnvironment);
        if (data.defaultCommand) {
          setCommand(data.defaultCommand);
        }
        if (data.defaultArgs) {
          setArgs(data.defaultArgs);
        }
      })
      .catch((error) => console.error('Error fetching default environment:', error));
  }, []);

  // ==================== Render =================
  return (
    <div className={styles.layout}>
      <div className={styles.menu}>
        {/* 🌟 Logo */}
        {logoNode}
        {/* 🌟 添加会话 */}
        <Button onClick={onAddConversation} type="link" className={styles.addBtn} icon={<PlusOutlined />}>
          New Conversation
        </Button>
        {/* 🌟 会话管理 */}
        <Conversations
          items={conversationsItems}
          className={styles.conversations}
          activeKey={activeKey}
          onActiveChange={onConversationClick}
        />
      </div>
      <div className={styles.chat}>
        {/* 🌟 消息列表 */}
        <Bubble.List
          items={items.length > 0 ? items : [{ content: placeholderNode, variant: 'borderless' }]}
          roles={roles}
          className={styles.messages}
        />
        {/* 🌟 提示词 */}
        <Prompts items={senderPromptsItems} onItemClick={onPromptsItemClick} />
        <Suggestion
          items={suggestions}
          onSelect={(itemVal) => {
            setContent((perv) => perv + itemVal);
          }}
        >
          {({ onTrigger, onKeyDown }) => {
            return (
              <Sender
                allowSpeech={{
                  recording: listening,
                  onRecordingChange: speechRecognition,
                }}
                value={content}
                header={senderHeader}
                onSubmit={onSubmit}
                onChange={(nextValue) => {
                  if (nextValue === '/') {
                    onTrigger();
                  } else if (!nextValue) {
                    onTrigger(false);
                  }
                  setContent(nextValue);
                }}
                placeholder="可任意输入 / 与 # 多次获取建议"
                prefix={attachmentsNode}
                loading={connectionStatus !== 'connected' ? true : agent.isRequesting()}
                disabled={connectionStatus === 'disconnected'}
                className={styles.sender}
                onKeyDown={onKeyDown}
                // components={{
                //   input: ({ autoSize, ...resetProps }) => {
                //     console.log(resetProps);
                //     return (
                //       <Select
                //         mode="tags"
                //         variant="borderless"
                //         onSearch={setContent}
                //         placeholder="可任意输入 / 与 # 多次获取建议"
                //         style={{ width: '100%' }}
                //         open={false}
                //         searchValue={content}
                //         {...resetProps}
                //       />
                //     );
                //   },
                // }}
              />
            );
          }}
        </Suggestion>
      </div>
    </div>
  );
};
