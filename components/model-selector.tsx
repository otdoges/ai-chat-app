'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Zap, Sparkles, Bot, Search, Crown, Star, Clock, Gauge } from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { availableModels } from "@/lib/services/aiService"
import env from "@/lib/env"
import { getSystemPromptDescription } from "@/lib/systemPrompt"

interface ModelSelectorProps {
  onModelChange: (modelId: string) => void
  currentModel: string
}

// Model provider icons
const getProviderIcon = (model: any) => {
  if (model.icon) return `/images/${model.icon}`
  if (model.provider === 'groq') return '/images/grok.svg'
  if (model.provider === 'github') {
    if (model.id.includes('openai') || model.id.includes('gpt') || model.id.includes('o4')) return '/images/openai.svg'
    if (model.id.includes('llama') || model.id.includes('meta')) return '/images/llama.svg'
    if (model.id.includes('mistral')) return '/images/mistral.svg'
    if (model.id.includes('grok')) return '/images/grok.svg'
    if (model.id.includes('phi')) return '/images/microsoft.svg'
  }
  if (model.provider === 'gemini') return '/images/gemini.svg'
  return '/images/openai.svg'
}

// Get provider display name
const getProviderName = (model: any) => {
  if (model.provider === 'groq') return 'Groq'
  if (model.provider === 'github') return 'GitHub'
  if (model.provider === 'gemini') return 'Google'
  return model.provider?.charAt(0).toUpperCase() + model.provider?.slice(1) || 'Unknown'
}

// Model badges for special features
const getModelBadges = (model: any) => {
  const badges = []
  if (model.reasoning) badges.push({ text: 'Reasoning', color: 'bg-purple-100 text-purple-800' })
  if (model.provider === 'groq') badges.push({ text: 'Ultra Fast', color: 'bg-green-100 text-green-800' })
  if (model.contextWindow > 100000) badges.push({ text: 'Long Context', color: 'bg-blue-100 text-blue-800' })
  return badges
}

export const ModelSelector = React.memo(({ onModelChange, currentModel }: ModelSelectorProps) => {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  
  // Get current model info
  const currentModelInfo = React.useMemo(() => {
    const model = availableModels.find(m => m.id === currentModel)
    return model || { id: currentModel, name: 'Select a model', provider: 'unknown' }
  }, [currentModel])

  // Filter and group models
  const { favorites, others } = React.useMemo(() => {
    const filtered = availableModels.filter(model => 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProviderName(model).toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    // Separate favorites (Groq models and reasoning models) from others
    const favorites = filtered.filter(model => 
      model.provider === 'groq' || model.reasoning
    )
    const others = filtered.filter(model => 
      model.provider !== 'groq' && !model.reasoning
    )
    
    return { favorites, others }
  }, [searchQuery])

  const handleModelSelect = React.useCallback((modelId: string) => {
    onModelChange(modelId)
    setOpen(false)
  }, [onModelChange])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-between font-medium transition-all duration-200",
            "hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50",
            currentModel && "bg-primary/5"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={getProviderIcon(currentModelInfo)}
                alt={currentModelInfo.name}
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold truncate max-w-[180px]">
                {currentModelInfo.name}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {getProviderName(currentModelInfo)}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] p-0" aria-describedby="model-selector-description">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">Choose a Model</DialogTitle>
          <div id="model-selector-description" className="sr-only">
            Select from available AI models including favorites like ultra-fast Groq models and reasoning models, or browse all available models by provider
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>
        
        <ScrollArea className="px-6 pb-6 max-h-[60vh]">
          {/* Favorites Section */}
          {favorites.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-yellow-500" />
                <h3 className="font-semibold text-sm text-muted-foreground">Favorites</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {favorites.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isSelected={currentModel === model.id}
                    onSelect={handleModelSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Others Section */}
          {others.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-sm text-muted-foreground">Others</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {others.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isSelected={currentModel === model.id}
                    onSelect={handleModelSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
})

// Individual Model Card Component
const ModelCard = React.memo(({ model, isSelected, onSelect }: {
  model: any
  isSelected: boolean
  onSelect: (id: string) => void
}) => {
  const badges = getModelBadges(model)
  
  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        "border-2 group",
        isSelected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-border hover:border-primary/50"
      )}
      onClick={() => onSelect(model.id)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col h-full">
          {/* Header with icon and status */}
          <div className="flex items-start justify-between mb-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={getProviderIcon(model)}
                alt={model.name}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            {isSelected && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            {model.reasoning && !isSelected && (
              <Badge className="bg-purple-100 text-purple-800 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Pro
              </Badge>
            )}
          </div>

          {/* Model name and provider */}
          <div className="flex-1 mb-3">
            <h4 className="font-semibold text-sm mb-1 line-clamp-2">
              {model.name}
            </h4>
            <p className="text-xs text-muted-foreground">
              {getProviderName(model)}
            </p>
          </div>

          {/* Context window info */}
          {model.contextWindow && (
            <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
              <Gauge className="h-3 w-3" />
              <span>{(model.contextWindow / 1000).toFixed(0)}K context</span>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {badges.slice(0, 2).map((badge, index) => (
                <Badge 
                  key={index}
                  className={cn("text-xs", badge.color)}
                  variant="secondary"
                >
                  {badge.text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

ModelSelector.displayName = "ModelSelector"
