'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message, SimulationChatInput } from '@/ai/schemas';
import { chatAboutSimulationAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatViewProps {
  simulationData: Omit<SimulationChatInput, 'messages'>;
  isPaused: boolean;
}

export function ChatView({ simulationData, isPaused }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clear chat when a new simulation is started (tick reset to 0)
  useEffect(() => {
    if (simulationData.ticks === 0) {
      setMessages([]);
    }
  }, [simulationData.ticks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatInput: SimulationChatInput = {
        ...simulationData,
        messages: [...messages, userMessage],
      };
      const result = await chatAboutSimulationAction(chatInput);
      const assistantMessage: Message = {
        role: 'model',
        content: result.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-gray-400">
              <p>Chat with SIM-SAGE about the simulation.</p>
              <p className="text-xs">Pause the simulation to ask questions.</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.role === 'model' && (
                <div className="p-2 bg-primary rounded-full text-primary-foreground">
                  <Bot size={16} />
                </div>
              )}
              <div
                className={`max-w-xs rounded-lg p-3 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="p-2 bg-secondary rounded-full">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary rounded-full text-primary-foreground">
                <Bot size={16} />
              </div>
              <div className="max-w-xs rounded-lg p-3 text-sm bg-secondary w-full">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the simulation..."
            disabled={!isPaused || isLoading}
            className="bg-gray-800 border-gray-700"
          />
          <Button type="submit" disabled={!isPaused || isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </div>
    </div>
  );
}
