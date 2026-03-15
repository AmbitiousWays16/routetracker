# RouteTracker — WestCare Staff Guide

## Audience

This guide is written for WestCare internal staff who use or oversee the RouteTracker application. It covers all business-facing roles:

- **End User (Employee/Staff)** — logs trips and submits monthly mileage vouchers
- **Supervisor** — first-stage approver for vouchers submitted by their direct reports
- **Deputy Administrator / VP** — second-stage approver
- **COO** — final approval authority before accounting processing
- **Accountant** — processes reimbursements based on fully approved vouchers

The application also has two system (back-end) roles:

- **Admin** — manages user roles, program lists, and system configuration
- **Developer** — maintains and enhances the application; manages infrastructure, security, and integrations

---

## Purpose

RouteTracker replaces the manual Excel-based mileage tracking process where staff had to download a separate map for every trip and, at month-end, print the spreadsheet and all maps to attach and physically submit for reimbursement.

With RouteTracker:
- Trips are logged digitally as they occur
- Routes and mileage are calculated automatically with one click (Google Maps integration)
- Monthly vouchers are assembled and submitted digitally
- Approvers review, approve, or reject through a structured multi-stage workflow
- A full audit trail is maintained for every action

---

## How the Application Works

### 1. Log Trips Throughout the Month

As an employee, you record each business trip as it happens. Each trip entry includes:

- **Date** of the trip
- **From address** and **To address**
- **Program** — the WestCare program or cost center associated with the trip
- **Purpose** — a plain-language description of why the trip occurred
- **Miles** — calculated automatically when you use "Calculate Route" (see below)
- Optional route map, attached automatically

### 2. Calculate Route (Google Maps Integration)

Clicking the **"Calculate Route"** button on the trip form uses the Google Maps API to compute the driving route between your origin and destination. It:

- Calculates the mileage for the trip automatically
- Attaches a map image of the route to the trip record

There is no need to open Google Maps separately, download a map, or print anything. One click handles it all.

### 3. AI Trip Purpose Suggestion

When entering a trip, you can use the **AI Trip Purpose Suggestion** feature. It generates trip purpose suggestions based on the trip details and the user's job title (to produce more role-relevant suggestions). You can accept a suggestion as-is or edit it to better describe your trip before saving.

This helps ensure trip purposes are descriptive and consistent, which reduces the chance of a rejection during approval review.

### 4. Prepare and Submit a Monthly Mileage Voucher

At the end of each month, you review all your logged trips for that month and submit a **Mileage Voucher** — a bundled reimbursement request covering the entire month.

- Review your trips before submitting; correct any errors first
- Once submitted, the voucher enters the approval workflow
- One voucher per user per month

### 5. Approval Workflow

Submitted vouchers move through three approval stages:

| Stage | Status | Action |
|---|---|---|
| Submitted by employee | **Pending Supervisor** | Supervisor reviews |
| Supervisor approves | **Pending VP** | Deputy Administrator/VP reviews |
| VP approves | **Pending COO** | COO reviews |
| COO approves | **Approved** | Ready for accounting |
| Any approver rejects | **Rejected** | Returned to employee with reason |

Each stage approver can:
- **Approve** — advance the voucher to the next stage
- **Reject** — return the voucher to the employee with a written reason

Rejected vouchers can be corrected and resubmitted by the employee.

### 6. Accounting Processing

Once a voucher status is **Approved**, it is available for the Accountant to process the reimbursement. The audit trail (who approved at each stage, and when) is preserved for compliance and financial review.

---

## Voucher Status Reference

| Status | Meaning |
|---|---|
| **Draft** | Not yet submitted; employee can still edit trips and the voucher |
| **Pending Supervisor** | Submitted; awaiting Supervisor approval |
| **Pending VP** | Supervisor approved; awaiting Deputy Administrator/VP approval |
| **Pending COO** | VP approved; awaiting COO final approval |
| **Approved** | Fully approved; ready for accounting reimbursement processing |
| **Rejected** | Returned to employee with a rejection reason for correction |

---

## Role-by-Role Guidance

### End User (Employee / Staff)

**Your workflow:**
1. Log trips as they occur throughout the month — use "Calculate Route" to auto-fill mileage and attach the map
2. Use AI Trip Purpose Suggestions when you need help writing a clear, role-relevant purpose
3. At month-end, review your trips, then submit your mileage voucher
4. Monitor your voucher status — if rejected, read the rejection reason, correct the issues, and resubmit

**Tips to avoid rejections:**
- Write trip purposes as you would explain them to an auditor
  - ✅ Good: `"Client home visit (case management) — follow-up on housing stability"`
  - ❌ Weak: `"Meeting"` / `"Visit"` / `"Work trip"`
- Make sure the **Program** field matches the actual work performed
- Double-check any unusually long mileage entries before submitting
- Submit your voucher promptly at month-end to avoid delays in reimbursement

---

### Supervisor (Approver Stage 1)

**Your workflow:**
1. Log in and navigate to the **Approvals** section
2. Review vouchers submitted by staff who report to you
3. For each voucher, check:
   - Trip purposes are specific and clearly business-related
   - Program assignments are correct
   - Mileage amounts look reasonable for the routes and dates
   - No missing or suspicious entries
4. **Approve** to advance to VP review, or **Reject** with a written reason

**When to reject:**
- Trip purpose is vague or unclear
- Program does not match the work described
- Mileage seems unreasonable for the route
- Missing required information

---

### Deputy Administrator / VP (Approver Stage 2)

**Your workflow:**
1. Navigate to the **Approvals** section to see vouchers that have passed Supervisor review
2. Review for:
   - Alignment with departmental budgets and program rules
   - Any patterns or anomalies across multiple submissions
   - Overall completeness and compliance
3. **Approve** to advance to COO review, or **Reject** with a written reason

---

### COO (Approver Stage 3 — Final Approval)

**Your workflow:**
1. Navigate to the **Approvals** section to see vouchers that have passed VP review
2. This is the final internal sign-off before accounting processes the reimbursement
3. Review for:
   - Organizational policy compliance
   - Any high-cost or high-risk outliers
   - Completeness of the approval chain
4. **Approve** to mark the voucher fully approved, or **Reject** with a written reason

---

### Accountant

**Your workflow:**
1. Access the list of **Approved** vouchers for the period you are processing
2. Use the voucher totals, trip breakdown, and approval audit trail to support reimbursement calculations
3. The audit trail confirms who approved each stage and when, supporting compliance and financial review

---

## Admin and Developer Roles (System Back-End)

### Admin

The Admin role manages system configuration and governance:
- Assigns and manages user roles (who is a Supervisor, VP, COO, etc.)
- Maintains the Programs list and other reference data
- Oversees account and access issues
- Manages data retention and archival controls

> Admins do not typically approve mileage vouchers unless they also hold an approval role.

### Developer

The Developer role maintains and enhances the application:
- Manages database migrations, security (row-level security policies), and performance
- Maintains integrations (Google Maps route calculation, Supabase authentication)
- Manages edge functions including the AI Trip Purpose Suggestion service
- Monitors, debugs, and deploys updates

---

## Tips and Best Practices

- **Log trips promptly** — it is easier to write an accurate purpose right after the trip than days later
- **Use "Calculate Route" for every trip** — it captures accurate mileage and attaches the map automatically, removing the need to print maps
- **Use AI Purpose Suggestions as a starting point** — they are tailored to your job title, but always review and adjust to reflect what actually happened
- **Check your voucher before submitting** — review all trips for the month to catch any errors before your Supervisor sees them
- **Read rejection reasons carefully** — they will tell you exactly what to fix before resubmitting

---

## Support Contacts

| Need | Who to Contact |
|---|---|
| Policy questions (what counts as a reimbursable trip, program codes) | Your Supervisor |
| Access problems, role assignment, missing programs in the list | RouteTracker Admin team |
| Application errors, unexpected behavior, outages | IT / Developer support channel |

For urgent access issues, contact your Supervisor first; they can escalate to the Admin team.
