import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a new conversation on first load
  useEffect(() => {
    const createConversation = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            title: 'New Conversation',
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating conversation:', error);
          return;
        }

        setConversationId(data.id);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };

    createConversation();
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!conversationId) {
      toast({
        title: "Error",
        description: "Conversation not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-mistral', {
        body: {
          message,
          conversationId,
        },
      });

      if (error) {
        throw error;
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get response from MediAssist AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, conversationId]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };
}