

## Add Organizational Context Documentation for AI Trip Purpose Suggestions

### Overview
This plan adds a documentation file to the `docs/` directory that provides WestCare-specific organizational context to enhance the AI trip purpose suggestions feature. The edge function will be updated to read this context and include it in the AI prompt for more relevant, role-specific suggestions.

### Current State Analysis

**Existing System:**
- The `trip-purpose-suggestions` edge function uses Perplexity AI to generate trip purpose suggestions
- It currently receives: `fromAddress`, `toAddress`, and `program` name
- The prompt generates generic business trip descriptions without organizational context

**User Request:**
- Add a documentation file with WestCare organizational context
- Enable the AI to generate better suggestions based on job titles and organizational mission

### Implementation Steps

**Step 1: Create the organizational context documentation**

Create a new file `docs/ORGANIZATIONAL_CONTEXT.md` that contains:
- WestCare's mission and vision statement
- Core service domains (mental health, substance use treatment, criminal justice, etc.)
- Common job responsibilities and role descriptions
- Regional programs overview
- Typical business activities by role type

This file will be structured in a way that the edge function can read and include relevant portions in the AI prompt.

**Step 2: Update the edge function to incorporate context**

Modify `supabase/functions/trip-purpose-suggestions/index.ts` to:
1. Accept an optional `jobTitle` parameter in the request
2. Include organizational context in the system prompt
3. Tailor suggestions based on the job title when provided

**Step 3: Update the frontend to pass job title**

If the user has a job title in their profile, pass it to the edge function for more personalized suggestions.

---

### Technical Details

**New Documentation File Structure (`docs/ORGANIZATIONAL_CONTEXT.md`):**

```text
# WestCare Organizational Context for AI Trip Purpose Suggestions

## Organization Mission
WestCare empowers people to engage in healing, growth, and change...
[Vision: "Uplifting the Human Spirit"]

## Core Service Domains
- Mental health and wellness
- Substance use treatment and rehabilitation
- Criminal justice programs and jail deflection
- Veteran services
- Housing support and recovery housing
- Domestic violence intervention
- Education and prevention programs
- Emergency support services

## Common Job Role Responsibilities

### Clinical Staff
- Client assessments and counseling
- Treatment planning and case management
- Crisis intervention
- Group therapy facilitation

### Case Managers
- Client home visits and welfare checks
- Court appearances and advocacy
- Resource coordination
- Service delivery and follow-up

### Program Directors/Supervisors
- Staff supervision and quality assurance
- Site inspections and compliance reviews
- Partnership meetings
- Training delivery

### Administrative Staff
- Coordination meetings
- Grant reporting activities
- Facility management
- Interagency collaboration

### Outreach Workers
- Community outreach and education
- Mobile service delivery
- Client transport assistance
- Prevention program delivery

## Regional Context
WestCare operates in 17 states plus territories, including:
Arizona, California, Florida, Georgia, Illinois, Iowa, Kentucky...
```

**Edge Function Changes:**

The prompt will be enhanced to include:
```text
Given a business trip from "${sanitizedFrom}" to "${sanitizedTo}"
${sanitizedProgram ? `for the "${sanitizedProgram}" program` : ''}
${jobTitle ? `for a ${jobTitle}` : ''}

Organization context:
- WestCare is a behavioral health and social services organization
- Core services include: mental health, substance use treatment, 
  criminal justice programs, veteran services, housing support,
  domestic violence intervention, and community outreach
- Staff typically travel for: client visits, court appearances,
  site inspections, training sessions, partnership meetings,
  outreach events, and service delivery

Generate 5 professional trip purpose descriptions...
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `docs/ORGANIZATIONAL_CONTEXT.md` | Create | WestCare organizational context documentation |
| `supabase/functions/trip-purpose-suggestions/index.ts` | Modify | Add organizational context to AI prompt and accept optional job title |

---

### Benefits

1. **More Relevant Suggestions**: AI will understand WestCare's mission and generate context-appropriate trip purposes
2. **Role-Specific Descriptions**: Job title awareness enables tailored suggestions (e.g., case manager vs. clinical staff)
3. **Professional Terminology**: Uses organization-specific language and service domains
4. **Maintainable**: Documentation file can be easily updated as organizational needs change

