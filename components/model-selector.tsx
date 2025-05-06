'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Zap } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { getSystemPromptDescription } from "@/lib/systemPrompt"

interface ModelSelectorProps {
  onModelChange: (modelId: string) => void
  currentModel: string
}

// Group models by provider for better organization
const modelGroups = {
  'OpenAI': availableModels.filter(m => typeof m.id === 'string' && m.id.startsWith('openai/')),
  'Meta': availableModels.filter(m => typeof m.id === 'string' && m.id.startsWith('meta/')),
  'Mistral': availableModels.filter(m => typeof m.id === 'string' && m.id.startsWith('mistralai/')),
  'Gemini': availableModels.filter(m => typeof m.id === 'string' && m.id.startsWith('gemini/')),
};

export function ModelSelector({ onModelChange, currentModel }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false)
  
  // Find the current model name for display
  const currentModelName = React.useMemo(() => {
    const model = availableModels.find(m => m.id === currentModel)
    return model?.name || 'Select a model'
  }, [currentModel])

  // No need for a separate modelDescription variable since we're using it directly in the UI

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center">
            <Zap className="mr-2 h-4 w-4 text-primary" />
            <span>{currentModelName}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          
          <CommandList>
            {Object.entries(modelGroups).map(([provider, models]) => (
              <React.Fragment key={provider}>
                <CommandGroup heading={`${provider} Models`}>
                  {models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={(currentValue) => {
                        onModelChange(currentValue)
                        setOpen(false)
                      }}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentModel === model.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{model.name}</span>
                      </div>
                      
                      <Badge 
                        variant={currentModel === model.id ? "default" : "outline"}
                        className="ml-2"
                      >
                        {getSystemPromptDescription(model.id)}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
