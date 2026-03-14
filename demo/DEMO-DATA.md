# Demo Seed Data Reference

All demo data is seeded from `lib/demo/seed.ts`, `lib/demo/seed-contractor.ts`, and `lib/demo/seed-lister.ts`. Dates are relative to the seed date (today). This document shows the exact data each profile receives.

---

## Table of Contents

1. [Profile Settings](#1-profile-settings)
2. [Financial Accounts](#2-financial-accounts)
3. [Budget Categories](#3-budget-categories)
4. [Financial Transactions](#4-financial-transactions)
5. [Vehicles](#5-vehicles)
6. [Fuel Logs](#6-fuel-logs)
7. [Trips](#7-trips)
8. [Contacts](#8-contacts)
9. [Equipment](#9-equipment)
10. [Exercise Categories & Exercises](#10-exercise-categories--exercises)
11. [Workout Logs](#11-workout-logs)
12. [Health Metrics](#12-health-metrics)
13. [Life Categories](#13-life-categories)
14. [Focus Sessions](#14-focus-sessions)
15. [Roadmaps, Goals, Milestones & Tasks](#15-roadmaps-goals-milestones--tasks)
16. [Recipes](#16-recipes)
17. [Blog Posts](#17-blog-posts)
18. [Daily Logs & Weekly Reviews](#18-daily-logs--weekly-reviews)
19. [Contractor: Venues](#19-contractor-venues)
20. [Contractor: Game Events / Jobs](#20-contractor-game-events--jobs)
21. [Contractor: Rate Cards](#21-contractor-rate-cards)
22. [Contractor: City Guides](#22-contractor-city-guides)
23. [Contractor: Union Memberships & Dues](#23-contractor-union-memberships--dues)
24. [Contractor: Invoices](#24-contractor-invoices)
25. [Lister: Roster](#25-lister-roster)
26. [Lister: Events & Assignments](#26-lister-events--assignments)
27. [Lister: Message Groups & Messages](#27-lister-message-groups--messages)

---

## 1. Profile Settings

| Field | Tutorial | Visitor | Contractor | Lister |
|---|---|---|---|---|
| `contractor_role` | *(not set)* | *(not set)* | `worker` | `lister` |
| `products` | *(not set)* | *(not set)* | `['contractor']` | *(not set)* |
| `lister_company_name` | — | — | — | `Midwest Crew Services` |
| `lister_union_local` | — | — | — | `IATSE 317` |

---

## 2. Financial Accounts

### Tutorial

| Name | Type | Opening Balance | Credit Limit |
|---|---|---|---|
| Primary Checking | checking | $4,200.00 | — |
| Visa Rewards | credit_card | $0 | $10,000 |

### Visitor

| Name | Type | Opening Balance | Credit Limit | Interest Rate |
|---|---|---|---|---|
| Chase Checking | checking | $8,540.22 | — | — |
| High-Yield Savings | savings | $24,000.00 | — | 4.75% |
| Chase Sapphire | credit_card | $0 | $25,000 | — |
| Amex Blue | credit_card | $0 | $15,000 | — |

### Contractor

| Name | Type | Opening Balance | Credit Limit |
|---|---|---|---|
| Business Checking | checking | $12,500.00 | — |
| Business Credit Card | credit_card | $0 | $15,000 |

### Lister

| Name | Type | Opening Balance | Credit Limit |
|---|---|---|---|
| Business Checking | checking | $12,000.00 | — |
| Business Credit Card | credit_card | $0 | $20,000 |

---

## 3. Budget Categories

### Tutorial

| Name | Color | Monthly Budget |
|---|---|---|
| Groceries | `#10b981` | $600 |
| Gas | `#f59e0b` | $200 |
| Dining Out | `#ef4444` | $300 |
| Utilities | `#6366f1` | $250 |
| Healthcare | `#3b82f6` | $150 |

### Visitor

| Name | Color | Monthly Budget |
|---|---|---|
| Groceries | `#10b981` | $800 |
| Gas | `#f59e0b` | $300 |
| Dining Out | `#ef4444` | $400 |
| Utilities | `#6366f1` | $350 |
| Healthcare | `#3b82f6` | $200 |
| Entertainment | `#ec4899` | $150 |
| Business | `#8b5cf6` | $500 |

### Contractor

| Name | Color | Monthly Budget |
|---|---|---|
| Equipment | `#f59e0b` | $500 |
| Travel | `#3b82f6` | $400 |
| Meals | `#ef4444` | $300 |
| Union Dues | `#6366f1` | $150 |

### Lister

*(No budget categories seeded)*

---

## 4. Financial Transactions

### Tutorial (20 transactions, 60-day span)

| Days Ago | Amount | Type | Description | Vendor | Category | Account |
|---|---|---|---|---|---|---|
| 3 | $124.56 | expense | Weekly groceries | Trader Joes | Groceries | Visa Rewards |
| 5 | $67.20 | expense | Fuel fill-up | Costco Gas | Gas | Visa Rewards |
| 7 | $42.80 | expense | Dinner | The Italian Place | Dining Out | Visa Rewards |
| 10 | $148.00 | expense | Electric bill | Pacific Gas & Electric | Utilities | Checking |
| 14 | $3,200.00 | income | Payroll deposit | Employer Direct Deposit | — | Checking |
| 17 | $89.99 | expense | Groceries | Whole Foods | Groceries | Visa Rewards |
| 19 | $60.00 | expense | Fuel fill-up | Chevron | Gas | Visa Rewards |
| 21 | $35.50 | expense | Lunch | Sweetgreen | Dining Out | Visa Rewards |
| 23 | $95.00 | expense | Doctor copay | Dr. Smith Family Medicine | Healthcare | Checking |
| 28 | $52.00 | expense | Internet service | Comcast | Utilities | Checking |
| 28 | $3,200.00 | income | Payroll deposit | Employer Direct Deposit | — | Checking |
| 31 | $112.34 | expense | Weekly groceries | Trader Joes | Groceries | Visa Rewards |
| 34 | $63.75 | expense | Fuel fill-up | Costco Gas | Gas | Visa Rewards |
| 36 | $28.00 | expense | Coffee & pastries | Blue Bottle Coffee | Dining Out | Visa Rewards |
| 40 | $143.00 | expense | Electric bill | Pacific Gas & Electric | Utilities | Checking |
| 43 | $78.20 | expense | Prescriptions | CVS Pharmacy | Healthcare | Visa Rewards |
| 42 | $3,200.00 | income | Payroll deposit | Employer Direct Deposit | — | Checking |
| 45 | $99.50 | expense | Groceries | Safeway | Groceries | Visa Rewards |
| 50 | $58.40 | expense | Fuel fill-up | Shell | Gas | Visa Rewards |
| 55 | $55.00 | expense | Internet service | Comcast | Utilities | Checking |

### Visitor (48 transactions, 91-day span)

| Days Ago | Amount | Type | Description | Vendor | Category | Account |
|---|---|---|---|---|---|---|
| 2 | $4,800.00 | income | Consulting invoice — TechCorp | TechCorp Inc. | Business | Checking |
| 3 | $156.78 | expense | Weekly groceries | Whole Foods | Groceries | Sapphire |
| 4 | $72.40 | expense | Gas fill-up | Costco Gas | Gas | Sapphire |
| 5 | $85.00 | expense | Client dinner | Bix Restaurant | Dining Out | Sapphire |
| 7 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |
| 8 | $43.20 | expense | Happy hour | The Monk's Kettle | Dining Out | Amex |
| 10 | $168.00 | expense | Electric bill | PG&E | Utilities | Checking |
| 11 | $62.50 | expense | Gas fill-up | Shell | Gas | Sapphire |
| 12 | $95.00 | expense | Office supplies | Staples | Business | Amex |
| 13 | $134.20 | expense | Groceries | Trader Joes | Groceries | Sapphire |
| 15 | $62.00 | expense | Internet + Phone | AT&T | Utilities | Checking |
| 16 | $55.00 | expense | Streaming services | Netflix + Spotify | Entertainment | Amex |
| 17 | $4,800.00 | income | Consulting — StartupXYZ | StartupXYZ | Business | Checking |
| 21 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |
| 22 | $130.00 | expense | Doctor visit + labs | UCSF Medical | Healthcare | Checking |
| 23 | $78.60 | expense | Gas fill-up | Chevron | Gas | Sapphire |
| 24 | $149.50 | expense | Groceries | Safeway | Groceries | Sapphire |
| 25 | $120.00 | expense | Concert tickets | Ticketmaster | Entertainment | Amex |
| 26 | $35.00 | expense | Brunch | Zazie | Dining Out | Amex |
| 27 | $500.00 | expense | Transfer to savings | Chase Savings | — | Checking |
| 30 | $164.00 | expense | Electric bill | PG&E | Utilities | Checking |
| 35 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |
| 36 | $112.00 | expense | Groceries | Whole Foods | Groceries | Sapphire |
| 37 | $68.90 | expense | Gas fill-up | Costco Gas | Gas | Sapphire |
| 38 | $3,600.00 | income | Consulting — MegaCorp | MegaCorp | Business | Checking |
| 40 | $245.00 | expense | Coworking space | WeWork | Business | Amex |
| 42 | $95.00 | expense | Pharmacy | Walgreens | Healthcare | Checking |
| 44 | $145.00 | expense | Groceries | Trader Joes | Groceries | Sapphire |
| 45 | $28.00 | expense | Lunch | Tartine Manufactory | Dining Out | Amex |
| 49 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |
| 50 | $500.00 | expense | Transfer to savings | Chase Savings | — | Checking |
| 52 | $75.20 | expense | Gas fill-up | Shell | Gas | Sapphire |
| 55 | $158.00 | expense | Electric bill | PG&E | Utilities | Checking |
| 57 | $135.50 | expense | Groceries | Safeway | Groceries | Sapphire |
| 60 | $65.00 | expense | Movie night x4 | AMC Theatres | Entertainment | Amex |
| 62 | $4,800.00 | income | Consulting — DataCo | DataCo | Business | Checking |
| 63 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |
| 65 | $89.00 | expense | Gas fill-up | Costco Gas | Gas | Sapphire |
| 67 | $172.00 | expense | Groceries (Costco bulk) | Costco | Groceries | Sapphire |
| 70 | $180.00 | expense | Dentist | Downtown Dental | Healthcare | Checking |
| 72 | $52.00 | expense | Dinner with friends | Flour + Water | Dining Out | Amex |
| 75 | $165.00 | expense | Electric bill | PG&E | Utilities | Checking |
| 77 | $500.00 | expense | Transfer to savings | Chase Savings | — | Checking |
| 77 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |
| 80 | $67.80 | expense | Gas fill-up | Chevron | Gas | Sapphire |
| 83 | $142.30 | expense | Groceries | Whole Foods | Groceries | Sapphire |
| 85 | $85.00 | expense | Accounting software | QuickBooks | Business | Amex |
| 87 | $3,200.00 | income | Consulting — BetaCo | BetaCo | Business | Checking |
| 88 | $48.50 | expense | Brunch with family | Foreign Cinema | Dining Out | Amex |
| 91 | $5,400.00 | income | Salary — main job | Employer LLC | — | Checking |

### Contractor (8 transactions)

| Days Ago | Amount | Type | Description | Vendor | Category | Account |
|---|---|---|---|---|---|---|
| 5 | $349.99 | expense | Pelican 1650 case for camera | B&H Photo | Equipment | Credit Card |
| 8 | $89.00 | expense | BNC cables and adapters | B&H Photo | Equipment | Credit Card |
| 10 | $67.20 | expense | Fuel — drive to Lucas Oil | Costco Gas | Travel | Credit Card |
| 10 | $42.50 | expense | Dinner after Colts game | St. Elmo Steak House | Meals | Credit Card |
| 15 | $125.00 | expense | IATSE 317 quarterly dues | IATSE Local 317 | Union Dues | Checking |
| 15 | $95.00 | expense | IBEW 1220 quarterly dues | IBEW Local 1220 | Union Dues | Checking |
| 6 | $38.75 | expense | Lunch at stadium — B1G Tourney | Gainbridge Fieldhouse Catering | Meals | Credit Card |
| 20 | $54.30 | expense | Fuel — drive to Bloomington | Shell | Travel | Credit Card |

### Lister (6 transactions)

| Days Ago | Amount | Type | Description | Vendor | Account |
|---|---|---|---|---|---|
| 5 | $1,200.00 | expense | Camera crew — Colts vs Dolphins | Jake Morrison | Checking |
| 8 | $900.00 | expense | Audio crew — Pacers vs Thunder | Carlos Reyes | Checking |
| 12 | $600.00 | expense | Utility crew — IU vs Michigan State | Nicole Foster | Checking |
| 15 | $49.99 | expense | CrewOps monthly subscription | Work.WitUS | Credit Card |
| 18 | $29.99 | expense | Google Workspace subscription | Google | Credit Card |
| 22 | $245.00 | expense | Office supplies — printer ink + paper | Staples | Credit Card |

---

## 5. Vehicles

### Tutorial

| Nickname | Type | Make | Model | Year | Ownership |
|---|---|---|---|---|---|
| My Camry | car | Toyota | Camry | 2022 | owned |

### Visitor

| Nickname | Type | Make | Model | Year | Ownership |
|---|---|---|---|---|---|
| My CR-V | car | Honda | CR-V | 2020 | owned |
| Trek FX3 | bike | Trek | FX 3 | 2021 | owned |

### Contractor

| Nickname | Type | Make | Model | Year | Ownership |
|---|---|---|---|---|---|
| Work Truck | truck | Ford | F-150 | 2021 | owned |

### Lister

| Nickname | Type | Make | Model | Year | Ownership |
|---|---|---|---|---|---|
| Work Truck | truck | Ford | F-150 | 2023 | owned |

---

## 6. Fuel Logs

### Tutorial (5 logs — My Camry)

| Days Ago | Odometer | Miles | Gallons | Cost | $/gal | MPG | Station |
|---|---|---|---|---|---|---|---|
| 5 | 24,850 | 312 | 8.9 | $30.56 | $3.43 | 35.1 | Costco Gas |
| 19 | 24,538 | 298 | 8.6 | $29.82 | $3.47 | 34.7 | Chevron |
| 34 | 24,240 | 305 | 8.8 | $30.41 | $3.46 | 34.7 | Costco Gas |
| 50 | 23,935 | 310 | 8.9 | $31.20 | $3.51 | 34.8 | Shell |
| 58 | 23,625 | 308 | 8.8 | $30.98 | $3.52 | 35.0 | Costco Gas |

### Visitor (12 logs — My CR-V)

| Days Ago | Odometer | Miles | Gallons | Cost | $/gal | MPG | Station |
|---|---|---|---|---|---|---|---|
| 4 | 52,340 | 285 | 9.8 | $34.12 | $3.48 | 29.1 | Costco Gas |
| 11 | 52,055 | 278 | 9.5 | $33.44 | $3.52 | 29.3 | Shell |
| 23 | 51,777 | 290 | 9.9 | $34.76 | $3.51 | 29.3 | Chevron |
| 29 | 52,878 | 340 | 11.7 | $41.60 | $3.56 | 29.1 | Costco Gas |
| 31 | 52,528 | 350 | 12.0 | $42.60 | $3.55 | 29.2 | Arco |
| 32 | 52,190 | 338 | 11.6 | $41.52 | $3.58 | 29.1 | BP |
| 33 | 51,835 | 355 | 12.2 | $43.68 | $3.58 | 29.1 | Mobil |
| 35 | 51,487 | 348 | 11.9 | $43.20 | $3.63 | 29.2 | Arco |
| 52 | 51,197 | 295 | 10.1 | $35.45 | $3.51 | 29.2 | Shell |
| 65 | 50,902 | 310 | 10.6 | $38.16 | $3.60 | 29.2 | Costco Gas |
| 80 | 50,592 | 288 | 9.9 | $35.64 | $3.60 | 29.1 | Chevron |
| 90 | 50,304 | 302 | 10.3 | $37.08 | $3.60 | 29.3 | Shell |

### Contractor (5 logs — Work Truck)

| Days Ago | Odometer | Miles | Gallons | Cost | $/gal | MPG | Station |
|---|---|---|---|---|---|---|---|
| 3 | 48,720 | 280 | 16.2 | $55.89 | $3.45 | 17.3 | Costco Gas |
| 10 | 48,440 | 265 | 15.8 | $54.51 | $3.45 | 16.8 | Shell |
| 20 | 48,175 | 290 | 16.5 | $57.09 | $3.46 | 17.6 | Chevron |
| 28 | 47,885 | 275 | 16.0 | $54.40 | $3.40 | 17.2 | Costco Gas |
| 38 | 47,610 | 260 | 15.5 | $52.70 | $3.40 | 16.8 | BP |

### Lister (2 logs — Work Truck)

| Days Ago | Odometer | Miles | Gallons | Cost | $/gal | MPG | Station |
|---|---|---|---|---|---|---|---|
| 4 | 18,200 | 280 | 14.2 | $48.96 | $3.45 | 19.7 | Speedway |
| 18 | 17,920 | 265 | 13.8 | $47.61 | $3.45 | 19.2 | Circle K |

---

## 7. Trips

### Tutorial (8 trips)

| Days Ago | Mode | Origin | Destination | Miles | Duration | Tax Category |
|---|---|---|---|---|---|---|
| 1 | car | Home | Office | 12.4 | 22 min | personal |
| 2 | car | Office | Home | 12.4 | 25 min | personal |
| 4 | bike | Home | Park | 8.2 | 35 min | personal |
| 8 | car | Home | Grocery Store | 3.1 | 8 min | personal |
| 14 | car | Home | Airport | 28.5 | 45 min | personal |
| 15 | bike | Hotel | Conference Center | 2.3 | 12 min | business |
| 22 | car | Home | Doctor | 7.8 | 18 min | medical |
| 30 | bike | Home | Farmers Market | 5.5 | 24 min | personal |

### Visitor (20 trips, including CA road trip)

| Days Ago | Mode | Origin | Destination | Miles | Duration | Tax Category |
|---|---|---|---|---|---|---|
| 1 | car | Home | Office | 18.2 | 32 min | personal |
| 2 | bike | Home | Embarcadero | 12.5 | 55 min | personal |
| 3 | car | Office | Client Site | 8.4 | 18 min | business |
| 5 | bike | Home | Golden Gate Park | 15.3 | 68 min | personal |
| 8 | car | Home | Grocery Store | 4.2 | 10 min | personal |
| 10 | car | Home | Airport SFO | 22.8 | 38 min | business |
| 12 | bike | Home | Marin Headlands | 24.8 | 95 min | personal |
| 14 | car | Home | Doctor | 5.6 | 14 min | medical |
| 19 | bike | Home | Ocean Beach | 18.0 | 78 min | personal |
| 22 | car | Home | Client Meeting | 12.1 | 25 min | business |
| 29 | car | Las Vegas, NV | San Francisco, CA | 570.0 | 540 min | personal |
| 31 | car | Joshua Tree, CA | Las Vegas, NV | 272.0 | 270 min | personal |
| 32 | car | San Diego, CA | Joshua Tree, CA | 148.0 | 155 min | personal |
| 34 | car | Los Angeles, CA | San Diego, CA | 121.0 | 120 min | personal |
| 35 | car | San Francisco, CA | Los Angeles, CA | 382.0 | 380 min | personal |
| 45 | car | Home | Dentist | 7.2 | 16 min | medical |
| 50 | bike | Home | Crissy Field | 10.5 | 45 min | personal |
| 55 | car | Home | Warehouse District | 9.8 | 20 min | business |
| 60 | bike | Home | Sausalito | 22.4 | 92 min | personal |
| 70 | car | Home | Conference Center | 3.5 | 9 min | business |

### Contractor (5 trips)

| Days Ago | Mode | Origin | Destination | Miles | Duration | Tax Category |
|---|---|---|---|---|---|---|
| 3 | car | Home | Lucas Oil Stadium | 48.5 | 55 min | business |
| 6 | car | Home | Gainbridge Fieldhouse | 45.2 | 50 min | business |
| 12 | car | Home | Simon Skjodt Assembly Hall | 52.8 | 60 min | business |
| 18 | car | Home | Lucas Oil Stadium | 48.5 | 55 min | business |
| 25 | car | Home | Gainbridge Fieldhouse | 45.2 | 50 min | business |

### Lister (2 trips)

| Days Ago | Mode | Origin | Destination | Miles | Duration | Tax Category |
|---|---|---|---|---|---|---|
| 3 | car | Office | Lucas Oil Stadium | 8.5 | 18 min | business |
| 10 | car | Office | Gainbridge Fieldhouse | 6.2 | 14 min | business |

---

## 8. Contacts

### Tutorial (3 contacts)

| Name | Type | Notes |
|---|---|---|
| Trader Joes | vendor | Weekly grocery store |
| Dr. Smith Family Medicine | vendor | Primary care physician |
| Costco Gas | vendor | Regular fuel stop |

### Visitor (8 contacts)

| Name | Type | Use Count |
|---|---|---|
| Costco Gas | vendor | 8 |
| Whole Foods | vendor | 6 |
| Trader Joes | vendor | 5 |
| Shell | vendor | 4 |
| Chevron | vendor | 3 |
| PG&E | vendor | 3 |
| TechCorp Inc. | customer | 2 |
| Honda Dealership | vendor | 2 |

### Contractor (10 contacts)

| Name | Type | Email | Phone |
|---|---|---|---|
| CBS Sports Production | vendor | crewing@cbssports.example.com | 212-555-0100 |
| ESPN Events | vendor | events@espn.example.com | 860-555-0200 |
| Fox Sports Regional | vendor | regional@foxsports.example.com | 310-555-0300 |
| NBC Sports | vendor | production@nbcsports.example.com | 212-555-0400 |
| Big Ten Network | vendor | crew@btn.example.com | 312-555-0500 |
| NFL Network | vendor | combine@nflnetwork.example.com | 310-555-0600 |
| Mike Torres | vendor | mike.torres@example.com | 317-555-1001 |
| Sarah Chen | vendor | sarah.chen@example.com | 317-555-1002 |
| Derek Williams | vendor | dwilliams@example.com | 480-555-2001 |
| Lisa Patel | vendor | lpatel@example.com | 520-555-3001 |

### Lister (10 roster contacts — see [Lister: Roster](#25-lister-roster))

---

## 9. Equipment

### Tutorial

| Name | Category | Brand | Purchase Price | Current Value | Condition |
|---|---|---|---|---|---|
| MacBook Pro 14" | Electronics | Apple | $1,999 | $1,600 | excellent |
| Resistance Bands Set | Fitness | TheraBand | $35 | $30 | good |

### Visitor

| Name | Category | Brand | Model | Purchase Price | Current Value | Condition |
|---|---|---|---|---|---|---|
| MacBook Pro 16" | Electronics | Apple | M3 Max | $3,499 | $3,000 | excellent |
| AirPods Pro | Electronics | Apple | 2nd Gen | $249 | $180 | good |
| Adjustable Dumbbells | Fitness | Bowflex | SelectTech 552 | $349 | $250 | good |
| Yoga Mat | Fitness | Manduka | PRO | $120 | $90 | excellent |
| Travel Backpack | Travel | Peak Design | Travel 45L | $299 | $220 | good |
| Standing Desk | Office | Uplift | V2 60" | $599 | $400 | excellent |

### Contractor

| Name | Category | Brand | Purchase Price | Current Value | Condition |
|---|---|---|---|---|---|
| Sony PXW-FX9 | Broadcast | Sony | $5,500 | $4,800 | excellent |
| Sachtler Video 18 Tripod | Broadcast | Sachtler | $1,800 | $1,500 | good |
| Teradek Bolt 4K | Broadcast | Teradek | $2,200 | $2,000 | excellent |
| iPad Pro 12.9" | Electronics | Apple | $1,099 | $950 | good |
| Pelican 1650 Case | Broadcast | Pelican | $349 | $320 | excellent |
| Sony MDR-7506 Headphones | Broadcast | Sony | $99 | $75 | good |

### Lister

| Name | Category | Brand | Purchase Price | Current Value | Condition |
|---|---|---|---|---|---|
| MacBook Pro 16" | Electronics | Apple | $2,499 | $2,100 | excellent |
| iPhone 15 Pro | Electronics | Apple | $1,199 | $1,050 | good |
| Ring Light | Office | Neewer | $89 | $75 | good |

---

## 10. Exercise Categories & Exercises

### Tutorial

**Categories:** Push, Pull, Legs, Core, Cardio

| Exercise | Category | Sets | Reps | Duration | Muscles |
|---|---|---|---|---|---|
| Push-ups | Push | 3 | 15 | — | chest, triceps |
| Pull-ups | Pull | 3 | 8 | — | back, biceps |
| Squats | Legs | 3 | 12 | — | quads, glutes |
| Plank | Core | 3 | — | 45s | core |
| Treadmill Run | Cardio | — | — | 20 min | legs, cardio |

### Visitor

**Categories:** Push, Pull, Legs, Core, Cardio, Mobility

| Exercise | Category | Sets | Reps | Weight | Duration | Muscles |
|---|---|---|---|---|---|---|
| Bench Press | Push | 4 | 8 | 155 lb | — | chest, triceps, shoulders |
| Push-ups | Push | 3 | 20 | — | — | chest, triceps |
| Overhead Press | Push | 3 | 10 | 95 lb | — | shoulders, triceps |
| Pull-ups | Pull | 4 | 8 | — | — | back, biceps |
| Barbell Rows | Pull | 4 | 10 | 135 lb | — | back, biceps |
| Back Squat | Legs | 4 | 8 | 185 lb | — | quads, glutes, hamstrings |
| Romanian Deadlift | Legs | 3 | 10 | 155 lb | — | hamstrings, glutes, lower back |
| Lunges | Legs | 3 | 12 | 40 lb | — | quads, glutes |
| Plank | Core | 3 | — | — | 60s | core |
| Dead Bug | Core | 3 | 10 | — | — | core, hip flexors |
| Treadmill Run | Cardio | — | — | — | 30 min | legs, cardio |
| Hip 90/90 Stretch | Mobility | 2 | — | — | 30s | hips |

### Contractor

**Categories:** Mobility, Strength, Cardio

| Exercise | Category | Sets | Reps | Duration | Muscles | Notes |
|---|---|---|---|---|---|---|
| Shoulder Mobility Circles | Mobility | 2 | 10 | — | shoulders, rotator cuff | — |
| Goblet Squats | Strength | 3 | 12 | — | quads, glutes, core | Camera-stability training |
| Farmer's Walks | Strength | 3 | — | 60s | forearms, traps, core | Grip strength for handheld camera |
| Treadmill Intervals | Cardio | — | — | 20 min | legs, cardio | — |
| Hip Flexor Stretch | Mobility | 2 | — | 30s | hip flexors, quads | After standing on camera platform |
| Dead Hangs | Strength | 3 | — | 45s | forearms, shoulders, lats | Decompress spine after camera rigs |

### Lister

**Categories:** Cardio, Strength, Flexibility

| Exercise | Category | Sets | Reps | Duration | Muscles |
|---|---|---|---|---|---|
| Morning Walk | Cardio | — | — | 30 min | legs, cardio |
| Desk Stretches | Flexibility | 3 | — | 60s | back, shoulders |
| Dumbbell Rows | Strength | 3 | 12 | — | back, biceps |

---

## 11. Workout Logs

### Tutorial (1 workout)

| Name | Days Ago | Duration | Feeling | Exercises |
|---|---|---|---|---|
| Morning Strength | 1 | 45 min | 4/5 | Push-ups (3×15), Squats (3×12 @135lb), Plank (3×45s) |

### Visitor (10 workouts over 30 days)

| Name | Days Ago | Duration | Feeling | Purpose |
|---|---|---|---|---|
| Push Day | 1 | 55 min | 4/5 | strength, hypertrophy |
| Pull Day | 2 | 50 min | 5/5 | strength |
| Leg Day | 4 | 60 min | 3/5 | strength, mobility |
| AM Priming | 6 | 15 min | 4/5 | mobility, warmup |
| Full Body HIIT | 8 | 30 min | 4/5 | conditioning, endurance |
| Upper Body | 10 | 50 min | 4/5 | strength |
| Recovery & Mobility | 14 | 25 min | 5/5 | mobility, recovery |
| Push Day | 17 | 55 min | 3/5 | strength, hypertrophy |
| Leg Day | 21 | 60 min | 4/5 | strength |
| AM Priming | 25 | 15 min | 4/5 | mobility, warmup |

### Contractor (5 workouts)

| Name | Days Ago | Duration | Feeling | Purpose |
|---|---|---|---|---|
| Pre-Show Warm-up | 3 | 35 min | 4/5 | mobility, strength |
| Hotel Gym Session | 8 | 45 min | 3/5 | strength, cardio |
| Morning Stretch | 12 | 20 min | 4/5 | mobility |
| Quick Cardio | 15 | 25 min | 3/5 | cardio |
| Full Body Workout | 20 | 55 min | 5/5 | strength, mobility, cardio |

### Lister (1 workout)

| Name | Days Ago | Duration | Feeling | Purpose |
|---|---|---|---|---|
| Quick Morning Routine | 1 | 30 min | 4/5 | health, energy |

---

## 12. Health Metrics

| Profile | Days | Resting HR Range | Steps Range | Sleep Range | Extra Fields |
|---|---|---|---|---|---|
| Tutorial | 14 | 58–65 bpm | 6,000–12,000 | 6.5–8.5h | activity_min |
| Visitor | 30 | 55–64 bpm | 7,000–14,000 | 6.0–8.5h | activity_min, hrv_ms, recovery_score, sleep_score, stress_score, active_calories, spo2_pct, weight_lbs (~174 lb) |
| Contractor | 7 | 62–69 bpm | 5,000–12,000 | 6.0–8.5h | — |
| Lister | 7 | 62–67 bpm | 5,000–9,000 | 6.0–8.0h | activity_min |

---

## 13. Life Categories

### Tutorial

| Name | Icon | Color |
|---|---|---|
| Health | heart | `#ef4444` |
| Finance | dollar-sign | `#10b981` |
| Career | briefcase | `#6366f1` |
| Relationships | users | `#f59e0b` |

### Visitor

| Name | Icon | Color |
|---|---|---|
| Health | heart | `#ef4444` |
| Finance | dollar-sign | `#10b981` |
| Career | briefcase | `#6366f1` |
| Relationships | users | `#f59e0b` |
| Fitness | dumbbell | `#ec4899` |
| Travel | map-pin | `#14b8a6` |
| Learning | book-open | `#8b5cf6` |
| Creativity | palette | `#f97316` |

### Contractor

| Name | Icon | Color |
|---|---|---|
| Career | briefcase | `#f59e0b` |
| Health | heart | `#ef4444` |
| Finance | dollar-sign | `#10b981` |
| Travel | map-pin | `#3b82f6` |
| Relationships | users | `#8b5cf6` |

### Lister

| Name | Icon | Color |
|---|---|---|
| Career | briefcase | `#6366f1` |
| Health | heart | `#ef4444` |
| Finance | dollar-sign | `#10b981` |
| Relationships | users | `#f59e0b` |

---

## 14. Focus Sessions

### Tutorial (3 sessions)

| Days Ago | Duration | Notes | Type |
|---|---|---|---|
| 1 | 25 min | Reviewing monthly budget categories | work |
| 2 | 50 min | Meal planning and recipe research for the week | focus |
| 3 | 30 min | Logging health metrics and daily reflection | focus |

### Visitor (10 sessions over 22 days)

| Days Ago | Duration | Notes | Type | Revenue |
|---|---|---|---|---|
| 0 | 50 min | Deep work on client proposal — DataCo SOW | focus | $125 |
| 1 | 75 min | Code review and architecture planning | work | — |
| 2 | 45 min | Blog writing — fuel tracking post | focus | — |
| 3 | 60 min | Financial reconciliation and invoice review | work | $150 |
| 4 | 50 min | Client presentation prep — TechCorp Q1 review | focus | $125 |
| 7 | 60 min | Market research for consulting pitch | focus | $150 |
| 10 | 45 min | Quarterly goal review and roadmap update | work | — |
| 14 | 45 min | Blog post outline — longevity habits for desk workers | focus | — |
| 18 | 60 min | StartupXYZ project planning session | work | $150 |
| 22 | 40 min | Equipment inventory and valuation updates | work | — |

### Contractor (5 sessions)

| Days Ago | Duration | Notes | Type |
|---|---|---|---|
| 1 | 30 min | Reviewing call sheets for B1G Tournament | work |
| 2 | 25 min | Logging time entries for completed Colts games | work |
| 3 | 25 min | Creating invoices for CBS Sports jobs | work |
| 4 | 30 min | Equipment inventory and condition check | work |
| 5 | 25 min | Updating city guide entries for Indianapolis | work |

### Lister (2 sessions)

| Days Ago | Duration | Notes | Type |
|---|---|---|---|
| 1 | 50 min | Crew scheduling for B1G Tournament — assigning 4 camera positions | work |
| 2 | 30 min | Reviewing CBS Sports contracts and updated rate cards for 2026 | focus |

---

## 15. Roadmaps, Goals, Milestones & Tasks

### Tutorial

**Roadmap:** 2026 Personal Roadmap

| Goal | Category | Status |
|---|---|---|
| Get Healthier | FITNESS | active |

| Milestone | Status |
|---|---|
| Establish workout routine | in_progress |

| Task | Time | Tag | Priority | Completed? |
|---|---|---|---|---|
| Morning walk (30 min) | 07:00 | health | 2 | No |
| Meal prep (lunches) | 12:00 | health | 2 | No |
| Gym session (upper body + core) | 06:30 | health | 1 | Yes |
| Grocery run (Whole Foods) | 08:00 | errands | 3 | Yes |
| Yoga (45 min flow) | 07:00 | health | 2 | Yes |

### Visitor

**Roadmap:** 2026 Life Operating System

| Goal | Category | Status |
|---|---|---|
| Optimize Health & Fitness | FITNESS | active |
| Grow Consulting Revenue | OUTREACH | active |
| Build Creative Habit | CREATIVE | active |

| Milestone | Goal | Status | Revenue |
|---|---|---|---|
| Consistent 4x/week workouts | Health & Fitness | in_progress | — |
| Complete health baseline labs | Health & Fitness | completed | — |
| Land 3 new clients Q1 | Consulting Revenue | in_progress | $14,400 |
| Write 10 blog posts | Creative Habit | not_started | — |

| Task | Milestone | Time | Tag | Completed? |
|---|---|---|---|---|
| AM Priming routine | 4x workouts | 06:30 | health | No |
| PM Recovery stretching | 4x workouts | 17:00 | health | No |
| Gym — Push day | 4x workouts | 06:30 | health | Yes |
| Gym — Pull day | 4x workouts | 06:30 | health | Yes |
| Active recovery — bike ride | 4x workouts | 07:00 | health | Yes |
| Gym — Legs day | 4x workouts | 06:30 | health | Yes |
| Client proposal — DataCo | 3 clients Q1 | 10:00 | work | No |
| Follow up with MegaCorp | 3 clients Q1 | 14:00 | work | No |
| Networking event prep | 3 clients Q1 | 09:00 | work | Yes |
| Invoice TechCorp | 3 clients Q1 | 11:00 | work | Yes |
| Write blog draft | 10 blog posts | 20:00 | creative | No |
| Publish blog post | 10 blog posts | 20:00 | creative | Yes |

### Contractor & Lister

*(No roadmaps/goals/tasks seeded)*

---

## 16. Recipes

### Tutorial (2 recipes)

| Title | Tags | Calories | Protein | Carbs | Fat | Fiber | Prep | Cook |
|---|---|---|---|---|---|---|---|---|
| Overnight Protein Oats | breakfast, high-protein, meal-prep | 420 | 35g | 48g | 10g | 8g | 10 min | 0 |
| Simple Green Smoothie | smoothie, green, quick | 310 | 12g | 38g | 14g | 6g | 5 min | 0 |

**Overnight Protein Oats — Ingredients:**

| Ingredient | Qty | Unit | Calories | Protein | Carbs | Fat | Fiber |
|---|---|---|---|---|---|---|---|
| Rolled oats | 0.5 | cup | 150 | 5g | 27g | 3g | 4g |
| Greek yogurt (plain, nonfat) | 0.5 | cup | 65 | 12g | 5g | 0g | 0g |
| Whole milk | 0.5 | cup | 75 | 4g | 6g | 4g | 0g |
| Whey protein powder | 1 | scoop | 120 | 24g | 3g | 1g | 0g |
| Chia seeds | 1 | tbsp | 60 | 2g | 5g | 4g | 5g |
| Mixed berries | 0.25 | cup | 20 | 0.5g | 5g | 0g | 1g |

**Simple Green Smoothie — Ingredients:**

| Ingredient | Qty | Unit | Calories | Protein | Carbs | Fat | Fiber |
|---|---|---|---|---|---|---|---|
| Baby spinach | 2 | cups | 14 | 2g | 2g | 0g | 1g |
| Banana (frozen) | 1 | medium | 105 | 1g | 27g | 0g | 3g |
| Almond butter | 1 | tbsp | 98 | 3g | 3g | 9g | 2g |
| Almond milk (unsweetened) | 1 | cup | 30 | 1g | 1g | 2.5g | 0g |

### Visitor, Contractor, Lister

*(No recipes seeded)*

---

## 17. Blog Posts

### Tutorial

| Title | Slug | Tags |
|---|---|---|
| My First Week Tracking Everything | first-week-tracking | tracking, habits, health |

### Visitor

*(No blog posts seeded — daily logs and weekly reviews serve as the content)*

### Contractor

| Title | Slug | Tags |
|---|---|---|
| A Day in the Life of a Freelance Camera Operator | day-in-the-life-freelance-camera-operator | freelance, camera, broadcast, behind-the-scenes |

### Lister

| Title | Slug | Tags |
|---|---|---|
| How I Manage 50+ Contractors Without Losing My Mind | manage-50-contractors | crew-management, freelance, operations |

---

## 18. Daily Logs & Weekly Reviews

### Tutorial

- **7 daily logs** with energy ratings, wins (e.g. "Completed gym session"), challenges (e.g. "Only got 5.5 hours of sleep"), and spending totals
- **1 weekly review** covering Health & Recovery, Finance, Movement, and Focus for Next Week

### Visitor

- **30 daily logs** with energy ratings, wins (e.g. "New PR on bench press", "Closed $4,800 invoice"), challenges (e.g. "Poor sleep — only 5.5 hours"), spending/earning
- **4 weekly reviews** — each is a comprehensive cross-module summary covering Health & Recovery, Finance, Movement & Travel, Focus & Productivity, and Recommended Focus

### Contractor & Lister

*(No daily logs or weekly reviews seeded)*

---

## 19. Contractor: Venues

| Venue | Address | City | State |
|---|---|---|---|
| Lucas Oil Stadium | 500 S Capitol Ave, Indianapolis, IN 46225 | Indianapolis | IN |
| Gainbridge Fieldhouse | 125 S Pennsylvania St, Indianapolis, IN 46204 | Indianapolis | IN |
| Simon Skjodt Assembly Hall | 1001 E 17th St, Bloomington, IN 47408 | Bloomington | IN |
| Memorial Stadium | 701 E 17th St, Bloomington, IN 47408 | Bloomington | IN |
| Mountain America Stadium | 500 E Veterans Way, Tempe, AZ 85287 | Tempe | AZ |
| Desert Financial Arena | 600 E Veterans Way, Tempe, AZ 85281 | Tempe | AZ |
| McKale Center at ALKEME Arena | 1 National Championship Dr, Tucson, AZ 85721 | Tucson | AZ |
| State Farm Stadium | 1 Cardinals Dr, Glendale, AZ 85305 | Glendale | AZ |
| Casino Del Sol Stadium | 545 N National Champion Dr, Tucson, AZ 85745 | Tucson | AZ |

### Venue Knowledge Base (3 venues with full details)

**Lucas Oil Stadium:**

| Topic | Details |
|---|---|
| Parking | Lot 1 (crew) off S Meridian St. $20/day. Badge required after 6am. |
| Load-in | Dock C on south side. Freight elevator to level 4. Badge required. |
| WiFi | LOS-Production / pw: provided day-of by technical director |
| Power | 200A distro at each camera platform. 20A in press box. |
| Catering | Green room level 3, section 145. Breakfast 6am, lunch 11:30am. |
| Security | Badge pickup at Gate 1 security office. Photo ID required. |

**Gainbridge Fieldhouse:**

| Topic | Details |
|---|---|
| Parking | Garage on Delaware St. Crew validation at production office. |
| Load-in | Loading dock on Maryland St. Check in with building ops. |
| WiFi | GBF-Media / pw: rotates monthly, check call sheet |
| Power | Standard 20A circuits at all camera positions. 60A at video village. |
| Catering | Media dining room level 2. Open 2hrs before tip. |
| Security | Credential pickup at media entrance, Pennsylvania St side. |

**State Farm Stadium:**

| Topic | Details |
|---|---|
| Parking | Red lot, south side. Free with crew credential. Gate opens 5hrs pre. |
| Load-in | Loading dock east side off 95th Ave. Ground-level access. |
| WiFi | SFS-Broadcast / pw: on call sheet |
| Power | 400A main distro field level. Tie-in required, coordinate with venue. |
| Catering | Crew meal tent, north concourse. Opens 4hrs before kickoff. |
| Security | Credential office at Gate 2. All bags subject to search. |

---

## 20. Contractor: Game Events / Jobs

Distribution: ~40% past, ~10% this week, ~50% upcoming. Offset days are relative to seed date.

### Past Events (completed — invoiced/paid)

| Client | Event | Venue | Offset | Dept | Rate | OT Rate | Union |
|---|---|---|---|---|---|---|---|
| CBS Sports | Colts vs Dolphins | Lucas Oil Stadium | -60 | Camera | $65 | $97.50 | IATSE 317 |
| CBS Sports | Colts vs Broncos | Lucas Oil Stadium | -53 | Camera | $65 | $97.50 | IATSE 317 |
| Fox Sports | Colts vs Raiders | Lucas Oil Stadium | -42 | Camera | $65 | $97.50 | IATSE 317 |
| ESPN | Colts vs Cardinals | Lucas Oil Stadium | -35 | Camera | $70 | $105 | IATSE 317 |
| Fox Sports | Cardinals vs Panthers | State Farm Stadium | -46 | Camera | $70 | $105 | — |
| ESPN | Cardinals vs Seahawks (TNF) | State Farm Stadium | -39 | Camera | $75 | $112.50 | — |
| Big Ten Network | IU vs North Texas | Memorial Stadium | -50 | Utility | $45 | $67.50 | — |
| ESPN | Pacers vs Thunder | Gainbridge Fieldhouse | -28 | Camera | $55 | $82.50 | IATSE 317 |
| NBC Sports | Pacers vs Warriors | Gainbridge Fieldhouse | -21 | Camera | $55 | $82.50 | IATSE 317 |
| ESPN | Arizona vs UCLA | McKale Center | -14 | Camera | $55 | $82.50 | — |
| ESPN+ | ASU vs Gonzaga | Desert Financial Arena | -10 | Camera | $50 | $75 | — |

### This Week (in_progress)

| Client | Event | Venue | Offset | Duration | Dept | Rate | OT Rate | Union |
|---|---|---|---|---|---|---|---|---|
| NFL Network | NFL Draft Combine | Lucas Oil Stadium | -1 | 7 days | Camera | $75 | $112.50 | IATSE 317 |
| CBS Sports | B1G Women's Basketball Tournament | Gainbridge Fieldhouse | 0 | 4 days | Camera | $60 | $90 | IATSE 317 |

### Upcoming Events (confirmed/assigned)

| Client | Event | Venue | Offset | Dept | Rate | OT Rate | Union |
|---|---|---|---|---|---|---|---|
| NBC Sports | Colts vs Texans | Lucas Oil Stadium | +7 | Camera | $70 | $105 | IATSE 317 |
| Fox Sports | Colts vs 49ers | Lucas Oil Stadium | +14 | Camera | $65 | $97.50 | IATSE 317 |
| Fox Sports Indiana | Pacers vs Kings | Gainbridge Fieldhouse | +10 | Camera | $50 | $75 | IATSE 317 |
| ESPN | Pacers vs Knicks | Gainbridge Fieldhouse | +21 | Camera | $55 | $82.50 | IATSE 317 |
| Big Ten Network | IU vs Michigan State | Memorial Stadium | +18 | Utility | $45 | $67.50 | — |
| Big Ten Network | IU vs Purdue | Simon Skjodt Assembly Hall | +28 | Camera | $50 | $75 | — |
| Fox Sports | Cardinals vs Packers | State Farm Stadium | +24 | Camera | $70 | $105 | — |
| CBS Sports | Cardinals vs 49ers | State Farm Stadium | +35 | Camera | $65 | $97.50 | — |
| Fox Sports | Cardinals vs Rams | State Farm Stadium | +42 | Camera | $70 | $105 | — |
| ESPN | Suns vs Lakers | Footprint Center | +30 | Camera | $60 | $90 | — |
| TNT | Suns vs Mavericks | Footprint Center | +45 | Camera | $60 | $90 | — |
| ESPN | ASU vs TCU | Mountain America Stadium | +38 | Utility | $45 | $67.50 | — |
| Fox Sports | ASU vs Arizona (Territorial Cup) | Mountain America Stadium | +52 | Camera | $55 | $82.50 | — |
| ESPN | Arizona vs BYU | Casino Del Sol Stadium | +56 | Utility | $45 | $67.50 | — |
| CBS Sports | Arizona vs Kansas | McKale Center | +60 | Camera | $60 | $90 | — |

---

## 21. Contractor: Rate Cards

| Name | Union | Department | ST Rate | OT Rate | DT Rate | Use Count |
|---|---|---|---|---|---|---|
| CBS Camera Op | IATSE 317 | Camera | $65 | $97.50 | $130 | 12 |
| ESPN Camera Op | IATSE 317 | Camera | $70 | $105 | $140 | 8 |
| BTN Utility | — | Utility | $45 | $67.50 | $90 | 5 |
| Fox Sports Camera | — | Camera | $65 | $97.50 | $130 | 6 |
| NFL Network Camera | IATSE 317 | Camera | $75 | $112.50 | $150 | 3 |

---

## 22. Contractor: City Guides

### Cities

| City | State | Region | Shared? | Notes |
|---|---|---|---|---|
| Indianapolis | IN | Midwest | Yes | Regularly work Colts, Pacers, and B1G events here. |
| Bloomington | IN | Midwest | No | IU campus — smaller town, fewer options. |
| Tempe | AZ | Southwest | Yes | ASU area. Great weather, good food scene. |
| Tucson | AZ | Southwest | No | UofA territory. Hot but affordable. |
| Glendale | AZ | Southwest | Yes | State Farm Stadium. Cards and big events. |

### City Guide Entries (15 entries)

**Indianapolis:**

| Category | Name | Rating | Price | Notes |
|---|---|---|---|---|
| restaurant | St. Elmo Steak House | 5/5 | $$$$ | Famous shrimp cocktail. Make reservations. |
| restaurant | Milktooth | 5/5 | $$$ | Best brunch in the city. Get there early. |
| hotel | JW Marriott Indianapolis | 4/5 | $$$ | Connected to convention center. Walking distance to Lucas Oil. |
| coffee | Coat Check Coffee | 5/5 | $$ | Best espresso downtown. |
| gym | The Fitness Center at IUPUI | 3/5 | $ | Day pass available. Basic but clean. |

**Tempe:**

| Category | Name | Rating | Price | Notes |
|---|---|---|---|---|
| restaurant | Four Peaks Brewing | 4/5 | $$ | Great burgers and local beer. |
| restaurant | Postino WineCafe | 4/5 | $$ | $6 wine and bruschetta before 5pm. |
| hotel | Graduate Tempe | 4/5 | $$ | Walking distance to stadium. Rooftop pool. |
| coffee | Cartel Coffee Lab | 5/5 | $$ | Excellent pour-over and cold brew. |

**Tucson:**

| Category | Name | Rating | Price | Notes |
|---|---|---|---|---|
| restaurant | El Charro Cafe | 4/5 | $$ | Oldest Mexican restaurant in the US. Try the carne seca. |
| hotel | Arizona Inn | 5/5 | $$$ | Beautiful old hotel. Great pool area. |

**Bloomington:**

| Category | Name | Rating | Price | Notes |
|---|---|---|---|---|
| restaurant | Nick's English Hut | 4/5 | $ | Classic IU hangout. Sink the Biz game. |
| restaurant | FARMbloomington | 5/5 | $$$ | Farm-to-table. Excellent cocktails. |

**Glendale:**

| Category | Name | Rating | Price | Notes |
|---|---|---|---|---|
| restaurant | Westgate Entertainment District | 4/5 | $$ | Tons of food options walking distance from stadium. |
| hotel | Renaissance Phoenix Glendale | 4/5 | $$$ | Right next to State Farm Stadium. Book early for NFL games. |

---

## 23. Contractor: Union Memberships & Dues

### Memberships

| Union | Local | Member ID | Status | Join Date | Dues | Frequency | Initiation Fee | Notes |
|---|---|---|---|---|---|---|---|---|
| IATSE | 317 | IA317-04892 | active | 2018-06-15 | $125.00 | quarterly | $500 (paid) | Primary local — Indiana. Camera department. |
| IBEW | 1220 | IBEW1220-7831 | active | 2021-03-01 | $95.00 | quarterly | $350 (paid) | Secondary local. Audio/electrical work. |

### Dues Payment History

| Union-Local | Amount | Days Ago | Period | Method | Confirmation |
|---|---|---|---|---|---|
| IATSE-317 | $125.00 | 180 | 180–90 days ago | check | IA-Q1 |
| IATSE-317 | $125.00 | 90 | 90–1 days ago | check | IA-Q2 |
| IATSE-317 | $125.00 | 5 | 1 day ago – 89 days from now | online | IA-Q3 |
| IBEW-1220 | $95.00 | 95 | 90–1 days ago | online | IB-Q1 |
| IBEW-1220 | $95.00 | 3 | 1 day ago – 89 days from now | online | IB-Q2 |

---

## 24. Contractor: Invoices

Invoices are generated for the first 6 past jobs with `invoiced` or `paid` status. Each invoice includes:

- **Direction:** receivable
- **Invoice number:** `INV-J-2300XX`
- **Due date:** 30 days after job end date
- **Line items:** Standard Time (8h/day × rate) + Overtime (2h every other day × OT rate)
- **Status:** `paid` (for paid jobs) or `sent` (for invoiced jobs)

---

## 25. Lister: Roster

| Name | Email | Phone | Skills | Notes |
|---|---|---|---|---|
| Jake Morrison | jmorrison@example.com | 317-555-4001 | Camera Op, Jib, Steadicam | IATSE 317. 15yrs exp. Prefers NFL/NCAA. |
| Amanda Liu | aliu@example.com | 317-555-4002 | Camera Op, RF Camera | IATSE 317. Great with handheld. Available weekends. |
| Carlos Reyes | creyes@example.com | 317-555-4003 | Audio A1, Audio A2 | IBEW 1220. Owns comms package. |
| Nicole Foster | nfoster@example.com | 317-555-4004 | Utility, Cable, EVS Replay | Non-union. Reliable, always early. |
| Marcus Johnson | mjohnson@example.com | 317-555-4005 | Camera Op, Studio Camera | IATSE 317. Prefers basketball. Available Nov-Apr. |
| Emily Tanaka | etanaka@example.com | 480-555-5001 | Camera Op, Jib, Rail Cam | Works AZ market. Can travel. |
| Bryan Scott | bscott@example.com | 480-555-5002 | Utility, EIC, Shader | Technical director assist. AZ-based. |
| Priya Sharma | psharma@example.com | 520-555-6001 | Camera Op, Robotic Camera | Tucson-based. U of A regular. |
| David Park | dpark@example.com | 812-555-7001 | Audio A2, Parabolic | Bloomington local. IU games regular. |
| Rachel Green | rgreen@example.com | 317-555-4006 | Graphics, Chyron, Telestrator | IATSE 317. In-house at Fieldhouse. |

---

## 26. Lister: Events & Assignments

### Lister Events (12 events)

| Event | Client | Venue | Start Date | Positions |
|---|---|---|---|---|
| Colts vs Dolphins | CBS Sports | Lucas Oil Stadium | 2025-09-07 | 3 |
| Colts vs Broncos | CBS Sports | Lucas Oil Stadium | 2025-09-14 | 3 |
| Pacers vs Thunder | ESPN | Gainbridge Fieldhouse | 2025-10-23 | 2 |
| Pacers vs Warriors | NBC Sports | Gainbridge Fieldhouse | 2025-11-01 | 2 |
| IU vs Michigan State | Big Ten Network | Memorial Stadium | 2025-10-18 | 2 |
| B1G Women's BBall Tournament | CBS Sports | Gainbridge Fieldhouse | 2026-03-04 | 4 |
| NFL Draft Combine 2026 | NFL Network | Lucas Oil Stadium | 2026-02-23 | 6 |
| Cardinals vs Seahawks (TNF) | ESPN | State Farm Stadium | 2025-09-25 | 2 |
| ASU vs Arizona (Territorial Cup) | Fox Sports | Mountain America Stadium | 2025-11-28 | 2 |
| Arizona vs UCLA | ESPN | McKale Center | 2025-11-14 | 2 |
| Colts vs Texans | NBC Sports | Lucas Oil Stadium | 2025-11-30 | 3 |
| IU vs Purdue | Big Ten Network | Simon Skjodt Assembly Hall | 2026-01-27 | 2 |

### Job Assignments

Assignments rotate through statuses: `accepted`, `accepted`, `offered`, `declined`. Each job gets up to its position count in assignments, cycling through roster members.

---

## 27. Lister: Message Groups & Messages

### Message Groups

| Group Name | Description |
|---|---|
| Camera Department | All camera operators in Indiana/Arizona markets |
| Audio Team | Audio A1 and A2 operators |
| Indianapolis Crew | All crew members based in Indianapolis area |

### Group Messages (5)

| Subject | Body (summary) |
|---|---|
| NFL Combine 2026 — Crew Call | Looking for 6 camera ops, Feb 23 - Mar 2. IATSE 317 rates. |
| B1G Tournament Crew | Need 4 camera ops, Mar 4-8. CBS Sports rate card. |
| Territorial Cup — AZ crew needed | ASU vs Arizona, Nov 28. Need 2 camera ops. Fox Sports rates. |
| Holiday Schedule Reminder | Colts vs 49ers Dec 22, Suns vs Lakers Dec 23. Full crews needed. |
| Rate Update — CBS Sports | Camera ops now $65/hr ST, $97.50 OT for 2026 season. |

### Individual Messages (5)

| Subject | Body (summary) |
|---|---|
| Colts vs Dolphins — Confirmed | Camera 3 at Lucas Oil, Sep 7. Call time 8:00 AM. |
| IU vs Purdue — Call Sheet Attached | Camera positions assigned for Jan 27. |
| Availability Check — March | Full B1G Tournament run, Mar 4-8. Five consecutive days. |
| W9 Reminder | CBS needs updated W9s before January invoices process. |
| Great job last weekend | Client feedback excellent. Shortlist for playoff games. |
