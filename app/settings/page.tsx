"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState("")
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically save the system prompt to your backend
    toast({
      title: "Settings Saved",
      description: "Your system prompt has been updated successfully.",
    })
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Evaluation Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Prompt Configuration</CardTitle>
          <CardDescription>
            Set the system prompt for the AI summarizer. This will affect how meeting summaries are generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Input
                  id="systemPrompt"
                  placeholder="Enter your system prompt here..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="submit">Save Settings</Button>
              </motion.div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

