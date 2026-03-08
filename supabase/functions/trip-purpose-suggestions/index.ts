import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - matching other edge functions
const allowedOrigins = [
  'https://dumhzvkifwhvdgswplew.supabase.co',
  'https://routetracker.lovable.app',
  'https://triptrackerapp.tech',
  'https://www.triptrackerapp.tech',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://id-preview--2face1c8-df08-44c3-9a59-cc212f800657.lovable.app',
  'https://2face1c8-df08-44c3-9a59-cc212f800657.lovableproject.com',
];

// Strict origin matching - no wildcards for production security
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
};

// Get CORS headers with origin validation
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
};

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 20; // Lower limit for expensive AI calls
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Check rate limit for a user
const checkRateLimit = (userId: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - userLimit.count };
};

// Input length limits
const MAX_ADDRESS_LENGTH = 500;
const MAX_PROGRAM_LENGTH = 200;
const MAX_JOB_TITLE_LENGTH = 100;

interface SuggestionRequest {
  fromAddress: string;
  toAddress: string;
  program: string;
  jobTitle?: string;
}

// WestCare organizational context for AI suggestions
const ORGANIZATIONAL_CONTEXT = `
Organization: WestCare - A behavioral health and social services nonprofit
Mission: Empowering people to engage in healing, growth, and change
Vision: Uplifting the Human Spirit

Core Services:
- Mental health and wellness services
- Substance use treatment and rehabilitation
- Criminal justice programs and jail deflection
- Veteran services and support programs
- Housing support and recovery housing
- Domestic violence intervention
- Community outreach and prevention

Common Travel Activities by Role:
- Clinical Staff: Client assessments, counseling sessions, crisis intervention, treatment planning
- Case Managers: Home visits, court appearances, client advocacy, resource coordination
- Program Directors: Site inspections, staff supervision, compliance reviews, partnership meetings
- Outreach Workers: Community events, mobile service delivery, prevention programs
- Medical Staff: Patient screenings, medication monitoring, healthcare coordination
- Residential Staff: Facility inspections, resident transport, shift coverage at locations
- Administrative: Coordination meetings, grant reporting, interagency collaboration
- IT Support/Information Technology: Hardware installation, computer repairs, network troubleshooting, software deployment, printer maintenance, workstation setup, server room visits, equipment delivery, tech support calls, system upgrades, security audits, data backup operations
- Help Desk/Technical Support: On-site technical assistance, equipment configuration, user training, peripheral installation, connectivity troubleshooting
`;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    // Check rate limit
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded for user');
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      });
    }

    console.log('Authenticated user requesting suggestions');

    // Parse request body
    const body: SuggestionRequest = await req.json();
    const { fromAddress, toAddress, program, jobTitle } = body;

    if (!fromAddress || !toAddress) {
      return new Response(JSON.stringify({ error: 'From and To addresses are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input length validation
    if (fromAddress.length > MAX_ADDRESS_LENGTH || toAddress.length > MAX_ADDRESS_LENGTH) {
      return new Response(JSON.stringify({ error: 'Address input too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (program && program.length > MAX_PROGRAM_LENGTH) {
      return new Response(JSON.stringify({ error: 'Program name too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Job title length validation
    if (jobTitle && jobTitle.length > MAX_JOB_TITLE_LENGTH) {
      return new Response(JSON.stringify({ error: 'Job title too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    /**
     * Input Sanitization Strategy:
     * 1. Remove HTML/XML special characters to prevent XSS and injection
     * 2. Remove control characters and null bytes
     * 3. Normalize unicode to prevent homoglyph attacks
     * 4. Strip excessive whitespace
     * 5. Limit character set to alphanumeric, common punctuation, and spaces
     */
    const sanitizeInput = (input: string): string => {
      if (!input || typeof input !== 'string') return '';
      
      return input
        // Normalize unicode to NFC form (prevents homoglyph attacks)
        .normalize('NFC')
        // Remove null bytes and control characters (except newline/tab)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove HTML/XML special characters and script-related patterns
        .replace(/[<>"'`\\]/g, '')
        // Remove javascript: and data: URI patterns
        .replace(/(?:javascript|data|vbscript):/gi, '')
        // Remove event handler patterns
        .replace(/on\w+\s*=/gi, '')
        // Collapse multiple spaces into single space
        .replace(/\s+/g, ' ')
        // Trim whitespace
        .trim();
    };

    const sanitizedFrom = sanitizeInput(fromAddress);
    const sanitizedTo = sanitizeInput(toAddress);
    const sanitizedProgram = program ? sanitizeInput(program) : '';
    const sanitizedJobTitle = jobTitle ? sanitizeInput(jobTitle) : '';
    
    // Validate sanitized inputs are not empty after sanitization
    if (!sanitizedFrom || !sanitizedTo) {
      return new Response(JSON.stringify({ error: 'Invalid address input after sanitization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Lovable AI API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's recent trip purposes from the last 60 days for personalized suggestions
    let recentPurposes: string[] = [];
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { data: recentTrips } = await supabase
        .from('trips')
        .select('purpose')
        .eq('user_id', user.id)
        .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
        .not('purpose', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentTrips && recentTrips.length > 0) {
        // Get unique purposes
        recentPurposes = [...new Set(recentTrips.map(t => t.purpose).filter(Boolean))].slice(0, 5);
        console.log('Found recent purposes:', recentPurposes.length);
      }
    } catch (err) {
      console.warn('Could not fetch recent purposes:', err);
      // Continue without recent purposes
    }

    // Create prompt for trip purpose suggestions
    const roleContext = sanitizedJobTitle 
      ? `\nThe staff member's role is: ${sanitizedJobTitle}. Tailor suggestions specifically to activities typical for this role.`
      : '';

    const recentPurposesContext = recentPurposes.length > 0
      ? `\n\nThe user has previously used these business purposes (use as reference for similar suggestions):\n${recentPurposes.map(p => `- "${p}"`).join('\n')}`
      : '';

    const prompt = `Given a business trip from "${sanitizedFrom}" to "${sanitizedTo}"${sanitizedProgram ? ` for the "${sanitizedProgram}" program` : ''}${roleContext}${recentPurposesContext}

${ORGANIZATIONAL_CONTEXT}

Generate 5 concise business purpose descriptions appropriate for a mileage reimbursement form.

Requirements:
- Professional and specific
- 5-15 words long
- Relevant to the organization's mission and the staff member's role
- If the role is IT Support, Help Desk, or Information Technology, focus on technical activities like: hardware repairs, software installation, network troubleshooting, workstation setup, equipment delivery, server maintenance, printer repairs, tech support visits
- If recent purposes are provided, use them as examples of the user's typical activities and generate similar suggestions
- Related to typical WestCare activities

Return ONLY a JSON array of 5 strings, no other text. Example format:
["Client home visit for case management follow-up", "Site inspection for program compliance review", "Training session delivery for staff development", "Community outreach event for prevention program", "Court appearance for client advocacy support"]`;

    console.log('Requesting AI suggestions from Lovable AI Gateway');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant that generates professional business trip purpose descriptions for mileage reimbursement forms at WestCare, a behavioral health and social services organization. Generate descriptions that reflect the organization\'s mission of empowering healing and growth. Always respond with valid JSON arrays only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      // Log detailed error server-side only - don't expose to client
      const errorText = await response.text();
      console.error('AI service error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Unable to generate suggestions. Please try again later.' }), {
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
        'Staff training and development session',
        'Community outreach and service delivery',
        'Case management and client follow-up',
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
      headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' },
    });
  }
});
