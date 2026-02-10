import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText, type ModelMessage, type LanguageModel, type ToolSet, type ToolChoice } from 'ai'

export interface AiSdkProviderOptions {
  apiKey: string
  baseUrl: string
  model: string
}

export interface AiSdkGenerateOptions {
  apiKey: string
  baseUrl: string
  model: string
  messages: ModelMessage[]
  temperature: number
  maxTokens: number
  tools?: ToolSet
  toolChoice?: ToolChoice<ToolSet>
  timeoutMs?: number
}

export const createAiModel = (options: AiSdkProviderOptions): LanguageModel => {
  const client = createOpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseUrl
  })
  return client.chat(options.model)
}

export const generateAiText = async (options: AiSdkGenerateOptions) => {
  const result = await generateText({
    model: createAiModel(options),
    messages: options.messages,
    temperature: options.temperature,
    maxOutputTokens: options.maxTokens,
    tools: options.tools,
    toolChoice: options.toolChoice,
    timeout: options.timeoutMs
  })
  return String(result.text ?? '').trim()
}

export const streamAiText = async function* (options: AiSdkGenerateOptions) {
  const result = await streamText({
    model: createAiModel(options),
    messages: options.messages,
    temperature: options.temperature,
    maxOutputTokens: options.maxTokens,
    tools: options.tools,
    toolChoice: options.toolChoice,
    timeout: options.timeoutMs
  })
  for await (const chunk of result.textStream) {
    yield String(chunk)
  }
}
