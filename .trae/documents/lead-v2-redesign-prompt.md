You are redesigning and replacing the existing Lead Details modal inside our commercial solar lead generation CRM. 

IMPORTANT: 
This is NOT a generic CRM. 
This is a lead generation platform specifically for commercial solar installers in the UK. 

The UI must look premium, modern, minimal, and enterprise-grade. 
The final design should closely match the attached reference image EXACTLY in terms of: 

* spacing 
* layout structure 
* proportions 
* visual hierarchy 
* card sizing 
* typography hierarchy 
* sidebar proportions 
* shadows 
* rounded corners 
* muted palette 
* modern SaaS aesthetic 

Design inspiration: 

* Attio 
* Linear 
* Arc Browser 
* Mercury banking dashboard 
* Notion AI 
* modern Vercel dashboard UI 

STYLE REQUIREMENTS: 

* clean white/light gray backgrounds 
* subtle borders (#E5E7EB style) 
* rounded-xl cards 
* soft shadows 
* minimal blue accent color 
* high whitespace usage 
* highly structured information architecture 
* NO clutter 
* NO heavy gradients 
* NO skeuomorphic styling 
* NO oversized buttons 
* thin iconography 
* modern typography similar to Inter font 

The new Lead Details modal/page should replace the current existing modal completely. 

TECH STACK: 

* Next.js 
* React 
* TailwindCSS 
* Supabase backend 
* TypeScript 

The page must be fully responsive but optimized primarily for desktop usage. 

--- 

## MAIN LAYOUT STRUCTURE 

Use a 3-column layout. 

LEFT SIDEBAR: 
Fixed-width company/contact column. 

CENTER CONTENT: 
Main lead intelligence and building information. 

RIGHT SIDEBAR: 
Activity timeline and lead summary. 

The modal/page should feel like a high-end internal sales operating system. 

--- 

## LEFT COLUMN 

Top company card: 

* Company logo/avatar 
* Company name 
* Lead status badge 
* Website URL 
* Quick contact icons 
* Industry 
* Company size 
* HQ location 
* Annual revenue 
* Company type 

Below that: 
“Contacts at Company” 

This section is VERY important. 

Multiple contacts must be supported per company because commercial businesses have: 

* procurement managers 
* finance managers 
* directors 
* sustainability managers 
* operations managers 

Each contact item should show: 

* avatar 
* full name 
* role/job title 
* primary contact badge 
* small online/active indicator 
* hover interaction 

Include: 

* Add Contact button 

Clicking a contact changes the active contact view in the center panel. 

--- 

## TOP CENTER HEADER 

Header should contain: 

* contact avatar 
* full name 
* job title 
* company name 
* status badges 

Badges examples: 

* Decision Maker 
* Budget Holder 
* Solar Interested 
* Qualified 
* Active Lead 

Right side: 
Quick action buttons: 

* Call 
* Email 
* LinkedIn 
* More 

Below header: 
Tabbed navigation: 

* Overview 
* Building Details 
* Contacts 
* Activity 
* Notes 
* Files 

--- 

## CENTER MAIN CONTENT 

Top row should contain 3 equal cards: 

1. LEAD OVERVIEW 
   Include: 

* lead status 
* lead source 
* campaign source 
* lead owner 
* first contacted date 
* last contacted date 
* lead score (circular score indicator) 
* qualification status 

2. SOLAR OPPORTUNITY 
   Include: 

* estimated system size (kWp) 
* estimated annual generation 
* estimated annual savings 
* estimated project value 
* estimated payback period 
* install timeframe 
* interest level 
* proposal stage 

3. KEY INFORMATION 
   Include: 

* pain point 
* primary need 
* budget confirmed 
* authority level 
* decision timeframe 
* best contact time 
* next action 
* assigned installer 

--- 

## BUILDING DETAILS SECTION 

THIS SECTION IS CRITICAL. 

The building details card should only take HALF WIDTH. 

Place it side-by-side with the Notes section. 

Building details should be vertically taller and extend downward into the previous “buying signals” space. 

REMOVE buying signals entirely. 

Building Details card should include: 

TOP: 
Large aerial image of building/site. 

Below: 
Structured property data grid. 

Fields: 

* site address 
* building type 
* roof type 
* roof condition 
* total roof area 
* usable roof area 
* annual consumption 
* peak demand 
* grid connection 
* shading score 
* orientation 
* suitability score 
* last updated 

Bottom row: 
status chips: 

* Site Visit Scheduled 
* Proposal Sent 
* Technical Survey 
* Planning Required 
* DNO Review 
* Battery Potential 
* EV Charging Potential 

Use muted colored chips. 

The building card must visually feel like: 
“technical building intelligence for solar suitability” 

--- 

## NOTES SECTION 

The Notes section must sit to the RIGHT of Building Details. 

It should be: 

* taller 
* chat-style 
* collaborative 
* live-updating feel 

NOT a plain text area. 

Design it like: 
Slack + Linear comments + Discord thread hybrid. 

Each note bubble should include: 

* avatar 
* sender name 
* timestamp 
* message bubble 

Support: 

* multiline notes 
* mentions 
* internal team comments 
* installer-only notes 
* pinned notes 

Bottom input area: 

* rounded message input 
* attachment icon 
* emoji icon 
* send/post button 

This should feel like a live sales collaboration thread. 

--- 

## BOTTOM CENTER TABLE 

“Active Leads” 

Modern clean table with: 

* lead name 
* building/site 
* system size 
* status 
* next action 
* last activity 

Use: 

* pill badges 
* hover states 
* clean row spacing 

--- 

## RIGHT SIDEBAR 

Top: 
Activity Timeline 

This should feel alive. 

Include: 

* emails opened 
* calls logged 
* LinkedIn replies 
* proposals sent 
* notes added 
* tasks completed 
* contact created 
* status changes 

Timeline should use: 

* colored icons 
* timestamps 
* vertical connectors 

Below: 
Lead Summary card: 

* total contacts 
* proposals 
* qualified 
* won 

Below: 
Tags section 

Below: 
Files section: 

* PDFs 
* proposals 
* energy bills 
* site surveys 
* roof plans 

--- 

## SUPABASE DATABASE CHANGES 

Add ALL missing schema fields automatically. 

Generate migration SQL for Supabase. 

Create or modify tables for: 

companies 
contacts 
leads 
buildings 
building_images 
notes 
activities 
files 
lead_tags 
tasks 

--- 

## BUILDINGS TABLE 

Must include: 

* id 
* company_id 
* address 
* building_type 
* roof_type 
* roof_condition 
* total_roof_area 
* usable_roof_area 
* annual_consumption 
* peak_demand 
* grid_connection 
* shading_score 
* orientation 
* suitability_score 
* estimated_kwp 
* estimated_generation 
* estimated_savings 
* estimated_payback 
* battery_potential 
* ev_potential 
* planning_required 
* dno_required 
* created_at 
* updated_at 

--- 

## NOTES TABLE 

Support threaded chat notes. 

Fields: 

* id 
* lead_id 
* user_id 
* message 
* attachments 
* mentions 
* pinned 
* internal_only 
* created_at 

--- 

## ACTIVITY TABLE 

Track: 

* emails 
* calls 
* stage changes 
* note creation 
* uploads 
* proposal sends 
* contact updates 

--- 

## FUNCTIONAL REQUIREMENTS 

Implement: 

* optimistic UI updates 
* realtime Supabase subscriptions 
* lazy image loading 
* infinite activity scroll 
* searchable contacts 
* editable inline fields 
* sticky action buttons 
* collapsible cards 
* smooth animations 
* skeleton loaders 
* hover transitions 

--- 

## UX REQUIREMENTS 

The UI should feel: 

* fast 
* intelligent 
* modern 
* collaborative 
* enterprise 
* operational 

The user should instantly understand: 

* who the lead is 
* what building is involved 
* how qualified the lead is 
* what the next action is 
* who on the team is handling it 

WITHOUT scrolling excessively. 

--- 

## IMPORTANT 

Do NOT create a generic CRM. 
Do NOT use dark mode. 
Do NOT use oversized spacing. 
Do NOT simplify the layout. 
Do NOT redesign creatively. 

Closely replicate the visual structure and proportions from the attached reference image while implementing the solar lead generation functionality described above. 

Generate: 

1. Full frontend implementation 
2. Tailwind components 
3. React components 
4. Supabase schema migrations 
5. Realtime hooks 
6. API integration 
7. TypeScript types 
8. Mobile responsiveness 
9. Dummy seed data 
10. Replace existing Lead Details modal entirely