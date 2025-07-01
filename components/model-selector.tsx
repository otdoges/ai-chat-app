'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Zap, Sparkles, Brain, Bot } from "lucide-react"

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

// Provider icons mapping for better visual identification
const getProviderIcon = (provider: string) => {
  switch (provider.toLowerCase()) {
    case 'openai': return <Brain className="h-4 w-4 text-green-500" />
    case 'meta': return <Bot className="h-4 w-4 text-blue-500" />
    case 'mistral': return <Sparkles className="h-4 w-4 text-orange-500" />
    case 'google': return <Zap className="h-4 w-4 text-red-500" />
    case 'xai': return <Sparkles className="h-4 w-4 text-purple-500" />
    default: return <Bot className="h-4 w-4 text-gray-500" />
  }
}

// Enhanced model grouping with better organization
const allModels = React.useMemo(() => availableModels.map(model => {
  let provider = 'Other';
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
}), []);

// Optimized model groups with sorted providers
const modelGroups = React.useMemo(() => {
  const groups = {
    'Featured': allModels.filter(m => 
      m.id.includes('gpt-4') || 
      m.id.includes('grok') || 
      m.id.includes('gemini-pro') ||
      m.id.includes('llama-3')
    ).slice(0, 4),
    'OpenAI': allModels.filter(m => m.provider === 'OpenAI'),
    'xAI': allModels.filter(m => m.provider === 'xAI' || (typeof m.id === 'string' && m.id.includes('grok'))),
    'Meta': allModels.filter(m => m.provider === 'Meta'),
    'Google': allModels.filter(m => m.provider === 'Google'),
    'Mistral': allModels.filter(m => m.provider === 'Mistral'),
    'Others': allModels.filter(m => !['OpenAI', 'Meta', 'Mistral', 'Google', 'xAI'].includes(m.provider)),
  };
  
  // Remove empty groups
  return Object.fromEntries(Object.entries(groups).filter(([_, models]) => models.length > 0));
}, []);

export function ModelSelector({ onModelChange, currentModel }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  
  // Memoized current model info for better performance
  const currentModelInfo = React.useMemo(() => {
    const model = availableModels.find(m => m.id === currentModel)
    return {
      name: model?.name || 'Select Model',
      provider: model?.provider || 'Unknown',
      id: model?.id || currentModel
    }
  }, [currentModel])

  // Optimized search filtering
  const filteredGroups = React.useMemo(() => {
    if (!searchValue) return modelGroups;
    
    const filtered: typeof modelGroups = {};
    Object.entries(modelGroups).forEach(([groupName, models]) => {
      const matchingModels = models.filter(model => 
        model.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        model.id.toLowerCase().includes(searchValue.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchValue.toLowerCase())
      );
      if (matchingModels.length > 0) {
        filtered[groupName] = matchingModels;
      }
    });
    return filtered;
  }, [searchValue]);

  const handleSelect = React.useCallback((modelId: string) => {
    onModelChange(modelId);
    setOpen(false);
    setSearchValue(""); // Clear search when selecting
  }, [onModelChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between h-12 bg-gradient-to-r from-background to-muted/50 border-2 hover:border-primary/50 transition-all duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            {getProviderIcon(currentModelInfo.provider)}
            <div className="flex flex-col items-start min-w-0">
              <span className="font-medium text-sm truncate max-w-[180px]">
                {currentModelInfo.name}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {currentModelInfo.provider}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search models..." 
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-12"
          />
          <CommandEmpty>No models found.</CommandEmpty>
          
          <CommandList className="max-h-[400px]">
            {Object.entries(filteredGroups).map(([provider, models], groupIndex) => (
              <React.Fragment key={provider}>
                <CommandGroup heading={
                  <div className="flex items-center gap-2 font-semibold">
                    {provider === 'Featured' && <Sparkles className="h-4 w-4 text-yellow-500" />}
                    {provider !== 'Featured' && getProviderIcon(provider)}
                    {provider}
                    <Badge variant="secondary" className="text-xs">
                      {models.length}
                    </Badge>
                  </div>
                }>
                  {models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.id}-${model.name}-${model.provider}`}
                      onSelect={() => handleSelect(model.id)}
                      className="flex items-center justify-between py-3 px-2 cursor-pointer hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            currentModel === model.id ? "opacity-100 text-primary" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium text-sm truncate">
                            {model.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {model.id}
                          </span>
                        </div>
                      </div>
                      
                      <Badge 
                        variant={currentModel === model.id ? "default" : "outline"}
                        className="ml-2 text-xs shrink-0"
                      >
                        {getSystemPromptDescription(model.id)}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {groupIndex < Object.entries(filteredGroups).length - 1 && <CommandSeparator />}
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
