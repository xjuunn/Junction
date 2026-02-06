import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { useSettingsStore } from '~/stores/settings'

export type AiProviderId = string

export interface AiProviderRuntimeConfig {
    apiKey: string
    baseUrl: string
    defaultModel: string
}

export interface AiRuntimeConfig {
    defaultProvider: AiProviderId
    providers: Record<string, AiProviderRuntimeConfig>
}

export interface AiModelOptions {
    providerId?: AiProviderId
    model?: string
    runtimeConfig?: AiRuntimeConfig
}

type ProviderFactory = (config: AiProviderRuntimeConfig) => (modelId: string) => LanguageModel

const providerFactories = new Map<AiProviderId, ProviderFactory>()
const providerInstances = new Map<AiProviderId, ReturnType<ProviderFactory>>()

providerFactories.set('deepseek', (config) => {
    const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
    })
    return (modelId: string) => openai(modelId)
})

/**
 * 注册新的 AI 提供方工厂
 */
export function registerAiProviderFactory(providerId: AiProviderId, factory: ProviderFactory) {
    if (!providerId) {
        throw new Error('AI 提供方注册失败：providerId 不能为空')
    }
    if (providerFactories.has(providerId)) {
        throw new Error(`AI 提供方注册失败：${providerId} 已存在`)
    }
    providerFactories.set(providerId, factory)
}

/**
 * 重置已缓存的提供方实例
 */
export function resetAiProviderCache(providerId?: AiProviderId) {
    if (!providerId) {
        providerInstances.clear()
        return
    }
    providerInstances.delete(providerId)
}

/**
 * 读取运行时 AI 配置
 */
export function getAiRuntimeConfig(): AiRuntimeConfig {
    const runtimeConfig = useRuntimeConfig()
    const aiConfig = runtimeConfig.public?.ai as AiRuntimeConfig | undefined
    if (!aiConfig?.defaultProvider) {
        throw new Error('AI 配置缺失：未设置默认提供方')
    }
    if (!aiConfig.providers?.[aiConfig.defaultProvider]) {
        throw new Error('AI 配置缺失：默认提供方未配置')
    }
    return aiConfig
}

/**
 * 获取指定提供方配置
 */
export function resolveAiProviderConfig(
    providerId?: AiProviderId,
    runtimeConfig?: AiRuntimeConfig
): AiProviderRuntimeConfig {
    const config = runtimeConfig ?? getAiRuntimeConfig()
    const clientOverride = getClientAiOverride()
    const resolvedProviderId = providerId ?? clientOverride.providerId ?? config.defaultProvider
    const providerConfig = config.providers?.[resolvedProviderId]
    if (!providerConfig) {
        throw new Error(`AI 配置缺失：未找到提供方 ${resolvedProviderId}`)
    }
    const apiKey = clientOverride.apiKey || providerConfig.apiKey
    const baseUrl = clientOverride.baseUrl || providerConfig.baseUrl
    const defaultModel = clientOverride.defaultModel || providerConfig.defaultModel
    if (!apiKey) {
        throw new Error(`AI 配置缺失：${resolvedProviderId} 未设置 API Key`)
    }
    if (!baseUrl) {
        throw new Error(`AI 配置缺失：${resolvedProviderId} 未设置 Base URL`)
    }
    if (!defaultModel) {
        throw new Error(`AI 配置缺失：${resolvedProviderId} 未设置默认模型`)
    }
    return {
        apiKey,
        baseUrl,
        defaultModel,
    }
}

/**
 * 创建语言模型实例
 */
export function createAiLanguageModel(options: AiModelOptions = {}): LanguageModel {
    const config = options.runtimeConfig ?? getAiRuntimeConfig()
    const providerId = options.providerId ?? config.defaultProvider
    const providerConfig = resolveAiProviderConfig(providerId, config)
    const factory = providerFactories.get(providerId)
    if (!factory) {
        throw new Error(`AI 提供方未注册：${providerId}`)
    }
    if (!providerInstances.has(providerId)) {
        providerInstances.set(providerId, factory(providerConfig))
    }
    const modelId = options.model ?? providerConfig.defaultModel
    const provider = providerInstances.get(providerId)
    if (!provider) {
        throw new Error(`AI 提供方初始化失败：${providerId}`)
    }
    return provider(modelId)
}

/**
 * 读取客户端覆盖配置
 */
export function getClientAiOverride() {
    if (!import.meta.client) {
        return {
            providerId: undefined,
            apiKey: '',
            baseUrl: '',
            defaultModel: '',
        }
    }
    const settings = useSettingsStore()
    return {
        providerId: settings.aiProviderId || undefined,
        apiKey: settings.aiApiKey || '',
        baseUrl: settings.aiBaseUrl || '',
        defaultModel: settings.aiDefaultModel || '',
    }
}
