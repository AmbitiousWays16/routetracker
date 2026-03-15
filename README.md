# RouteTracker — WestCare Internal Overview

RouteTracker is WestCare's internal application for recording business travel, calculating mileage, and submitting monthly mileage vouchers through a structured approval workflow.

## The Problem It Solves

Previously, WestCare staff tracked mileage using a manual Excel spreadsheet process: employees had to manually open Google Maps for every trip, download or print a map image, then at month-end print the spreadsheet and all individual maps to attach and physically submit for reimbursement. This was time-consuming, error-prone, and difficult to audit.

RouteTracker replaces this workflow end-to-end — trips are logged digitally, routes are calculated and attached automatically, and monthly vouchers move through a fully digital approval chain (Supervisor → Deputy Administrator/VP → COO) before reaching accounting.

## Google Maps Integration

The **"Calculate Route"** button on the trip entry form uses the Google Maps API to calculate the route between the origin and destination addresses with one click. It automatically computes the mileage and attaches a map of the route to the trip record — no manual downloading or printing of maps required.

## AI Trip Purpose Suggestions

When entering a trip, staff can use the **AI Trip Purpose Suggestion** feature. It generates trip purpose suggestions based on the trip details and the user's job title (to produce more role-relevant suggestions). Staff can accept a suggestion as-is or edit it before saving.

## Approval Workflow

Submitted vouchers follow this status flow:

**Draft → Pending Supervisor → Pending VP → Pending COO → Approved / Rejected**

Each approval stage is recorded in a full audit trail for compliance and accounting purposes.

## Staff Guide

For full role-by-role guidance, workflow details, tips, and support contacts, see the **[Staff Guide](docs/STAFF_GUIDE.md)**.