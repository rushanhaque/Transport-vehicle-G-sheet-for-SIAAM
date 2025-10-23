# SIAAM Land Transport Co. - Ledger App

Mobile-first web application for recording receivings, expenses, and generating reports.

## Features Implemented

### 🎯 Record Receiving (T1)
- Auto timestamp on form load
- Date picker (default: today)
- Amount input (required)
- Mode dropdown:
  - Transferred via bank
  - Received in cash
- Description (optional)

### 💰 Record Expense (T2)
- Auto timestamp on form load
- Bill date picker (default: today)
- **VAT bill / Non-VAT bill selector**:
  - **VAT bill**: Enter VAT amount → Auto-calculates:
    - Net Amount = VAT ÷ 0.15
    - Gross Amount = Net + VAT
    - Total amount auto-filled with Gross Amount (readonly)
  - **Non-VAT bill**: Manual amount entry
- **Type of Expense dropdown** (required):
  - Inspection
  - Maintenance
  - Repair
  - Fuel
  - Other (makes description mandatory)
- Description field (mandatory for "Other" type)
- **Vehicle dropdown** (optional):
  - USA-8262, USA-8263, USA-8264, USA-8265
  - NXA-4330, NXA-4028, NXA-3805
  - XSA-9578
- ODO meter reading (optional, for maintenance tracking)
- Service Station name (optional)

### 📊 View Report (T3)
- Date range filter (from/to)
- Previous balance input (optional)
- Tabular display with columns:
  - Type (Receiving/Expense)
  - Date
  - Amount
  - Expense Type
  - Vehicle
  - VAT/Mode
  - Description
- Summary totals:
  - Total Amount Received
  - Total Amount Paid
  - Remaining Balance = Previous Balance + Received - Paid

### 📁 Data Management
- **Storage**: localStorage (works offline)
- **CSV Export**: Google Sheets compatible
  - Headers: Type, Timestamp, Date, Amount, Expense Type, Vehicle, VAT/Mode, Description
  - Properly escaped values
  - ISO date format (YYYY-MM-DD)

### 📱 Progressive Web App (PWA)
- Installable on mobile devices
- Offline-first with service worker
- App manifest for home screen icon
- Responsive mobile-first design

## Validation Rules

1. **Expense Type**: Must be selected (Inspection/Maintenance/Repair/Fuel/Other)
2. **Description**: Required when Expense Type = "Other"
3. **VAT Amount**: Required when "VAT bill" is selected
4. **Date & Amount**: Always required

## Technology Stack

- **Frontend**: Vanilla JavaScript
- **Styling**: Tailwind CSS (CDN)
- **Storage**: localStorage API
- **PWA**: Service Worker + Web Manifest

## How to Run

1. Start a local server:
   ```bash
   python -m http.server 8000
   ```
2. Open browser: http://localhost:8000
3. Or use VS Code Live Server extension

## File Structure

```
├── index.html          # Main UI
├── app.js              # Application logic
├── manifest.webmanifest # PWA manifest
├── sw.js               # Service worker
├── icons/              # App icons (placeholder)
└── README.md           # This file
```

## Usage Notes

- All data stored locally in browser
- Clear browser data = data loss (consider regular CSV exports)
- VAT calculation assumes 15% rate
- ODO readings tracked per expense for maintenance records
- CSV exports can be opened directly in Google Sheets
