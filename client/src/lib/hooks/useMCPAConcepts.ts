import {
  ClientRequest,
  CompatibilityCallToolResult,
  CompatibilityCallToolResultSchema,
  GetPromptResult,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListToolsResultSchema,
  Prompt,
  ReadResourceResultSchema,
  Resource,
  ResourceTemplate,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { useConnection } from './useConnection';

type UseMCPAConceptsProps = {
  makeConnectionRequest: ReturnType<typeof useConnection>['makeRequest'];
};

export const useMCPAConcepts = (props: UseMCPAConceptsProps) => {
  const { makeConnectionRequest } = props;
  const [resourceSubscriptions, setResourceSubscriptions] = useState<Set<string>>(new Set<string>());
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTemplates, setResourceTemplates] = useState<ResourceTemplate[]>([]);
  const [resourceContent, setResourceContent] = useState<string>('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptContent, setPromptContent] = useState<string>('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [nextResourceCursor, setNextResourceCursor] = useState<string>();
  const [nextResourceTemplateCursor, setNextResourceTemplateCursor] = useState<string>();
  const [nextPromptCursor, setNextPromptCursor] = useState<string>();
  const [nextToolCursor, setNextToolCursor] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string | null>>({
    resources: null,
    prompts: null,
    tools: null,
  });
  const [toolResult, setToolResult] = useState<CompatibilityCallToolResult | null>(null);
  const progressTokenRef = useRef(0);
  const clearError = (tabKey: keyof typeof errors) => {
    setErrors((prev) => ({ ...prev, [tabKey]: null }));
  };
  const makeRequest = async <T extends z.ZodType>(request: ClientRequest, schema: T, tabKey?: keyof typeof errors) => {
    try {
      const response = await makeConnectionRequest(request, schema);
      if (tabKey !== undefined) {
        clearError(tabKey);
      }
      return response;
    } catch (e) {
      const errorString = (e as Error).message ?? String(e);
      if (tabKey !== undefined) {
        setErrors((prev) => ({
          ...prev,
          [tabKey]: errorString,
        }));
      }
      throw e;
    }
  };
  const listResources = async () => {
    const response = await makeRequest(
      {
        method: 'resources/list' as const,
        params: nextResourceCursor ? { cursor: nextResourceCursor } : {},
      },
      ListResourcesResultSchema,
      'resources',
    );
    setResources(resources.concat(response.resources ?? []));
    setNextResourceCursor(response.nextCursor);
  };

  const listResourceTemplates = async () => {
    const response = await makeRequest(
      {
        method: 'resources/templates/list' as const,
        params: nextResourceTemplateCursor ? { cursor: nextResourceTemplateCursor } : {},
      },
      ListResourceTemplatesResultSchema,
      'resources',
    );
    setResourceTemplates(resourceTemplates.concat(response.resourceTemplates ?? []));
    setNextResourceTemplateCursor(response.nextCursor);
  };

  const readResource = async (uri: string) => {
    const response = await makeRequest(
      {
        method: 'resources/read' as const,
        params: { uri },
      },
      ReadResourceResultSchema,
      'resources',
    );
    setResourceContent(JSON.stringify(response, null, 2));
  };

  const subscribeToResource = async (uri: string) => {
    if (!resourceSubscriptions.has(uri)) {
      await makeRequest(
        {
          method: 'resources/subscribe' as const,
          params: { uri },
        },
        z.object({}),
        'resources',
      );
      const clone = new Set(resourceSubscriptions);
      clone.add(uri);
      setResourceSubscriptions(clone);
    }
  };

  const unsubscribeFromResource = async (uri: string) => {
    if (resourceSubscriptions.has(uri)) {
      await makeRequest(
        {
          method: 'resources/unsubscribe' as const,
          params: { uri },
        },
        z.object({}),
        'resources',
      );
      const clone = new Set(resourceSubscriptions);
      clone.delete(uri);
      setResourceSubscriptions(clone);
    }
  };

  const listPrompts = async () => {
    const response = await makeRequest(
      {
        method: 'prompts/list' as const,
        params: nextPromptCursor ? { cursor: nextPromptCursor } : {},
      },
      ListPromptsResultSchema,
      'prompts',
    );
    setPrompts(response.prompts);
    setNextPromptCursor(response.nextCursor);
  };

  const getPrompt = async (name: string, args: Record<string, string> = {}): Promise<GetPromptResult> => {
    const response = await makeRequest(
      {
        method: 'prompts/get' as const,
        params: { name, arguments: args },
      },
      GetPromptResultSchema,
      'prompts',
    );
    setPromptContent(JSON.stringify(response, null, 2));
    return response;
  };
  const listTools = async () => {
    const response = await makeRequest(
      {
        method: 'tools/list' as const,
        params: nextToolCursor ? { cursor: nextToolCursor } : {},
      },
      ListToolsResultSchema,
      'tools',
    );
    setTools(response.tools);
    setNextToolCursor(response.nextCursor);
  };

  const callTool = async (name: string, params: Record<string, unknown>): Promise<CompatibilityCallToolResult> => {
    const response = await makeRequest(
      {
        method: 'tools/call' as const,
        params: {
          name,
          arguments: params,
          _meta: {
            progressToken: progressTokenRef.current++,
          },
        },
      },
      CompatibilityCallToolResultSchema,
      'tools',
    );

    setToolResult(response);
    return response;
  };

  return {
    callTool,
    resources,
    resourceTemplates,
    resourceContent,
    prompts,
    promptContent,
    tools,
    errors,
    toolResult,
    listResources,
    listResourceTemplates,
    readResource,
    subscribeToResource,
    unsubscribeFromResource,
    listPrompts,
    getPrompt,
    listTools,
  };
};
