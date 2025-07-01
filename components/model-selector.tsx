'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Zap, Sparkles, Bot } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { availableModels } from "@/lib/services/aiService"
import env from "@/lib/env"
import { Badge } from "@/components/ui/badge"
import { getSystemPromptDescription } from "@/lib/systemPrompt"

interface ModelSelectorProps {
  onModelChange: (modelId: string) => void
  currentModel: string
}

// Provider color mapping for better performance - static outside component
const providerColors = {
  'OpenAI': 'from-emerald-500 to-teal-600',
  'Meta': 'from-blue-500 to-blue-600', 
  'Mistral': 'from-orange-500 to-amber-600',
  'Google': 'from-red-500 to-pink-600',
  'xAI': 'from-purple-500 to-violet-600',
  'Others': 'from-gray-500 to-slate-600'
} as const

// Memoized provider icon component
const ProviderIcon = React.memo(({ provider }: { provider: string }) => {
  const iconClass = "h-4 w-4"
  switch (provider) {
    case 'OpenAI':
      return <Bot className={iconClass} />
    case 'Meta':
      return <Sparkles className={iconClass} />
    case 'Google':
      return <Zap className={iconClass} />
    default:
      return <Bot className={iconClass} />
  }
})
ProviderIcon.displayName = "ProviderIcon"

export const ModelSelector = React.memo(({ onModelChange, currentModel }: ModelSelectorProps) => {
  const [open, setOpen] = React.useState(false)
  
  // Move useMemo hooks inside the component
  const allModels = React.useMemo(() => availableModels.map(model => {
    // Get provider from model id or use custom provider if set
    let provider = 'Others';
    if (model.provider) {
      provider = model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
    } else if (typeof model.id === 'string') {
      if (model.id.startsWith('openai/')) provider = 'OpenAI';
      else if (model.id.startsWith('meta/')) provider = 'Meta';
      else if (model.id.startsWith('mistralai/')) provider = 'Mistral';
      else if (model.id.startsWith('gemini/')) provider = 'Google';
      else if (model.id.startsWith('xai/')) provider = 'xAI';
    }
    return { ...model, provider };
  }), [])

  // Memoized model groups
  const modelGroups = React.useMemo(() => ({
    'OpenAI': allModels.filter(m => m.provider === 'OpenAI'),
    'Meta': allModels.filter(m => m.provider === 'Meta'),
    'Mistral': allModels.filter(m => m.provider === 'Mistral'),
    'Google': allModels.filter(m => m.provider === 'Google'),
    'xAI': allModels.filter(m => m.provider === 'xAI' || (typeof m.id === 'string' && m.id.includes('grok'))),
    'Others': allModels.filter(m => !['OpenAI', 'Meta', 'Mistral', 'Google', 'xAI'].includes(m.provider)),
  }), [allModels])
  
  // Memoized current model info
  const currentModelInfo = React.useMemo(() => {
    const model = availableModels.find(m => m.id === currentModel)
    const provider = allModels.find(m => m.id === currentModel)?.provider || 'Others'
    return { 
      name: model?.name || 'Select a model',
      provider,
      model
    }
  }, [currentModel, allModels])

  // Memoized handlers for better performance
  const handleModelSelect = React.useCallback((modelId: string) => {
    onModelChange(modelId)
    setOpen(false)
  }, [onModelChange])

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen)
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[280px] justify-between font-medium transition-all duration-200",
            "bg-gradient-to-r hover:shadow-lg hover:scale-[1.02]",
            "border-2 hover:border-primary/50",
            currentModelInfo.provider && `bg-gradient-to-r ${providerColors[currentModelInfo.provider as keyof typeof providerColors]} text-white border-transparent hover:border-white/20`
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0">
              <ProviderIcon provider={currentModelInfo.provider} />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold truncate max-w-[180px]">
                {currentModelInfo.name}
              </span>
              <span className="text-xs opacity-80 truncate max-w-[180px]">
                {currentModelInfo.provider}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 shadow-2xl border-2">
        <Command>
          <CommandInput 
            placeholder="Search AI models..." 
            className="text-sm"
          />
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            No models found.
          </CommandEmpty>
          
          <CommandList className="max-h-[400px] overflow-y-auto">
            {Object.entries(modelGroups)
              .filter(([_, models]) => models.length > 0)
              .map(([provider, models]) => (
              <React.Fragment key={provider}>
                <CommandGroup 
                  heading={
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className={cn(
                        "h-3 w-3 rounded-full bg-gradient-to-r",
                        providerColors[provider as keyof typeof providerColors]
                      )} />
                      <span className="font-semibold text-sm">{provider} Models</span>
                      <Badge variant="secondary" className="text-xs h-5">
                        {models.length}
                      </Badge>
                    </div>
                  }
                >
                  {models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.id} ${model.name}`}
                      onSelect={() => handleModelSelect(model.id)}
                      className={cn(
                        "flex items-center justify-between py-3 px-3 cursor-pointer",
                        "hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent",
                        "transition-all duration-200",
                        currentModel === model.id && "bg-primary/5 border-l-4 border-l-primary"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                          "bg-gradient-to-r text-white shadow-sm",
                          providerColors[provider as keyof typeof providerColors]
                        )}>
                          <ProviderIcon provider={provider} />
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium text-sm truncate">
                            {model.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {model.id}
                          </span>
                        </div>
                        
                        <Check
                          className={cn(
                            "h-4 w-4 transition-opacity duration-200",
                            currentModel === model.id ? "opacity-100 text-primary" : "opacity-0"
                          )}
                        />
                      </div>
                      
                      <Badge 
                        variant={currentModel === model.id ? "default" : "outline"}
                        className="ml-3 text-xs shrink-0 max-w-[100px] truncate"
                      >
                        {getSystemPromptDescription(model.id)}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator className="my-1" />
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

ModelSelector.displayName = "ModelSelector"
