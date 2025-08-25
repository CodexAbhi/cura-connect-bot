import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();
    console.log('Received request:', { message, conversationId });

    const mistralApiKey = Deno.env.get('MISTRAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY not found');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Get conversation history for context
    let conversationHistory = [];
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('content, is_user')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(10); // Get last 10 messages for context

      if (error) {
        console.error('Error fetching conversation history:', error);
      } else {
        conversationHistory = messages || [];
      }
    }

    // Build context from conversation history
    const contextMessages = conversationHistory.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.content
    }));

    // Prepare messages for Mistral API
    const systemMessage = {
      role: 'system',
      content: `You are MediAssist AI, a helpful healthcare assistant. You provide medical information and guidance, but always remind users that your advice should not replace professional medical consultation. Be empathetic, accurate, and thorough in your responses. Always encourage users to seek professional medical advice for serious concerns.

IMPORTANT: Base your responses on the conversation history provided to maintain context and continuity.`
    };

    const messages = [
      systemMessage,
      ...contextMessages,
      { role: 'user', content: message }
    ];

    console.log('Sending request to Mistral API with', messages.length, 'messages');

    // Call Mistral API
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'open-mistral-7b', // Using free tier model instead of mistral-large-latest
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error('Mistral API error:', errorText);
      throw new Error(`Mistral API error: ${mistralResponse.status} ${errorText}`);
    }

    const mistralData = await mistralResponse.json();
    const aiResponse = mistralData.choices[0].message.content;

    console.log('Received response from Mistral API');

    // Save user message and AI response to database
    if (conversationId) {
      // Save user message
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: message,
          is_user: true
        });

      // Save AI response
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: aiResponse,
          is_user: false
        });

      console.log('Messages saved to database');
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      conversationId: conversationId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-mistral function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});