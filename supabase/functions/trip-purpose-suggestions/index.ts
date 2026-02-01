import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SuggestionRequest {
  fromAddress: string;
  toAddress: string;
  program: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate JWT manually
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('JWT validation failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user requesting suggestions');

    // Parse request body
    const body: SuggestionRequest = await req.json();
    const { fromAddress, toAddress, program } = body;

    if (!fromAddress || !toAddress) {
      return new Response(JSON.stringify({ error: 'From and To addresses are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Perplexity API key
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create prompt for trip purpose suggestions
    const prompt = `Given a business trip from "${fromAddress}" to "${toAddress}"${program ? ` for the "${program}" program` : ''}, suggest 5 concise business purpose descriptions that would be appropriate for a mileage reimbursement form. 

Each suggestion should be:
- Professional and specific
- 5-15 words long
- Related to typical business activities (client meetings, site visits, training, deliveries, etc.)

Return ONLY a JSON array of 5 strings, no other text. Example format:
["Client meeting at downtown office", "Site inspection for quarterly review", "Training session delivery", "Equipment delivery and setup", "Staff supervision and quality check"]`;

    console.log('Requesting AI suggestions from Perplexity');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant that generates professional business trip purpose descriptions for mileage reimbursement forms. Always respond with valid JSON arrays only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate suggestions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response received, parsing suggestions');

    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback suggestions if parsing fails
      suggestions = [
        'Client meeting and consultation',
        'Site visit for program support',
        'Staff training and supervision',
        'Service delivery and follow-up',
        'Administrative coordination meeting',
      ];
    }

    // Ensure we have an array of strings
    if (!Array.isArray(suggestions)) {
      suggestions = [];
    }
    suggestions = suggestions.filter(s => typeof s === 'string').slice(0, 5);

    console.log('Returning suggestions:', suggestions.length);

    return new Response(JSON.stringify({ suggestions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
