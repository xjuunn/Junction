import type { ModelMessage } from 'ai'
import { generateText, streamText } from 'ai'
import type { AiProviderId } from '~/utils/ai'
import { createAiLanguageModel } from '~/utils/ai'

export interface AiTextRequest {
    providerId?: AiProviderId
    model?: string
    system?: string
    prompt?: string
    messages?: ModelMessage[]
    temperature?: number
    topP?: number
    topK?: number
    presencePenalty?: number
    frequencyPenalty?: number
    stopSequences?: string[]
    seed?: number
    maxRetries?: number
    timeout?: number
    headers?: Record<string, string>
}

/**
 * 生成文本（非流式）
 */
export async function generateAiText(options: AiTextRequest) {
    const request = buildAiPrompt(options)
    const model = createAiLanguageModel({
        providerId: options.providerId,
        model: options.model,
    })
    return await generateText({
        model,
        ...request,
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        presencePenalty: options.presencePenalty,
        frequencyPenalty: options.frequencyPenalty,
        stopSequences: options.stopSequences,
        seed: options.seed,
        maxRetries: options.maxRetries,
        timeout: options.timeout,
        headers: options.headers,
    })
}

/**
 * 生成文本（流式）
 */
export async function streamAiText(options: AiTextRequest) {
    const request = buildAiPrompt(options)
    const model = createAiLanguageModel({
        providerId: options.providerId,
        model: options.model,
    })
    return await streamText({
        model,
        ...request,
        temperature: options.temperature,
        topP: options.topP,
        topK: options.topK,
        presencePenalty: options.presencePenalty,
        frequencyPenalty: options.frequencyPenalty,
        stopSequences: options.stopSequences,
        seed: options.seed,
        maxRetries: options.maxRetries,
        timeout: options.timeout,
        headers: options.headers,
    })
}

/**
 * 构建提示词参数并校验输入
 */
export function buildAiPrompt(options: AiTextRequest) {
    if (options.prompt && options.messages) {
        throw new Error('AI 请求参数错误：prompt 与 messages 不能同时传入')
    }
    if (!options.prompt && (!options.messages || options.messages.length === 0)) {
        throw new Error('AI 请求参数错误：必须传入 prompt 或 messages')
    }
    if (options.prompt) {
        return { system: options.system, prompt: options.prompt }
    }
    return { system: options.system, messages: options.messages || [] }
}
