"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  setCustomSystemPrompt, 
  getCustomSystemPrompt, 
  clearCustomSystemPrompt, 
  hasCustomSystemPrompt,
  systemPrompts
} from "@/lib/systemPrompt";

interface CustomSystemPromptProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export default function CustomSystemPrompt({ isOpen, onOpenChange, onSave }: CustomSystemPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    const customPrompt = getCustomSystemPrompt();
    setPrompt(customPrompt || "");
    setHasCustom(hasCustomSystemPrompt());
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setCustomSystemPrompt(prompt);
      setHasCustom(hasCustomSystemPrompt());
      onSave?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    clearCustomSystemPrompt();
    setPrompt("");
    setHasCustom(false);
    onSave?.();
  };

  const handleReset = () => {
    // Get the default unified prompt
    const defaultPrompt = Object.values(systemPrompts)[0]?.prompt || "";
    setPrompt(defaultPrompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Custom System Prompt
            {hasCustom && <Badge variant="secondary">Active</Badge>}
          </CardTitle>
          <CardDescription>
            Override the default system prompt with your custom instructions. 
            This will apply to all models and is stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your custom system prompt here..."
              className="min-h-[200px] resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {prompt.length} characters
            </div>
          </div>

          {hasCustom && (
            <Alert>
              <AlertDescription>
                You have a custom system prompt active. It will override the default prompt for all models.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
            >
              {isSaving ? "Saving..." : "Save Custom Prompt"}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReset}
              size="sm"
            >
              Load Default Prompt
            </Button>
            
            {hasCustom && (
              <Button
                variant="outline"
                onClick={handleClear}
                size="sm"
              >
                Clear Custom Prompt
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}