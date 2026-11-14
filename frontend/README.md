# LaunderLens AML Investigation Platform

An enterprise-grade Anti-Money Laundering (AML) and Financial Crime Network Investigation Platform tailored for Indian banking rails (RBI RTGS, NEFT, IMPS, and UPI mule ring detection).

---

## Key Capabilities

- **Indian Banking & Currency Standardization:** Full ₹ INR accounting across all alert queues, case reviews, and graph edges.
- **Interactive Multi-Hop Money Trail:** Directed graph visualization tracing fund dispersal across source accounts, multi-tier mule intermediaries, hubs, and exit consolidation accounts with scrubbable timeline animation and jump-to-hop controls.
- **Visual Contrast & Fullscreen Graph Modes:** Dedicated Default, Dark Canvas, and High-Contrast Accessibility views with collision-free SVG node pill badges.
- **Dynamic Dataset Management:**
  - Upload CSV or JSON transaction records from local storage.
  - Interactive Paste Mode with live parsing.
  - Downloadable Sample CSV Template.
  - Pre-loaded Indian Banking Benchmark Datasets (RBI RTGS/NEFT Mule Network, UPI Smurfing Ring, Cross-Border Layering).
- **FIU-IND Forensic Typology Intelligence Reports:** Comprehensive breakdowns across Scatter-Gather, Rapid Pass-Through, Fan-Out, Fan-In, and Circular Wash Trading with PDF print export and JSON dossier download.
- **Interactive Red-Team Simulation:** Dynamic configuration of laundering scenarios, transaction volumes, network hops, and detection baseline thresholds.
- **Role-Based Authentication:** Multi-user security with demo investigator profiles (Lead Investigator, Senior AML Analyst, FIU Compliance Officer).

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:8443](http://localhost:8443) (or your terminal's designated Vite port) in your web browser.

### 3. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

### 4. Preview Production Build
```bash
npm run preview
```

---

## Tech Stack
- **Framework:** React 19 + TypeScript 5.7
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS v4
- **Icons:** Inline SVG Icons
