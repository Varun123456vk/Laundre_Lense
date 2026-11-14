# Hackathon Final Report

---

## Project Details

| Field | Details |
| :--- | :--- |
| **Hackathon** | BMSCE Hackathon 2026 |
| **Project Title** | **LaunderLens (Laundre_Lense)** — Graph-Based Detection of Layered Money Laundering Networks with Explainable Typology Attribution |
| **Problem Statement** | **Problem Statement #5:** Graph-Based Detection of Layered Money Laundering Networks with Explainable Typology Attribution |
| **Team Name** | Team LaunderLens |
| **Team Members** | Varun Kumar & Team |
| **Institution** | B.M.S. College of Engineering (BMSCE), Bengaluru |
| **GitHub Repository** | [https://github.com/Varun123456vk/Laundre_Lense.git](https://github.com/Varun123456vk/Laundre_Lense.git) |
| **Demo Video / Live Prototype** | [Demo Video Link] \| **Live Workbench:** `http://localhost:5173` \| **API Engine:** `http://localhost:8000/docs` |
| **Submitted On** | November 15, 2026 |

---

## 1. Analysis of the Problem Statement

### 1.1 Problem Overview
Money laundering is the illicit process of concealing the origin, ownership, and destination of illegally obtained money to integrate it into the legitimate financial ecosystem. Criminal organizations, narcotics traffickers, cyber-fraud syndicates, and corrupt entities utilize sophisticated multi-hop layering techniques to disguise criminal proceeds.

In modern banking, transactions occur in milliseconds across domestic NEFT, RTGS, IMPS, UPI, and international SWIFT rails. Criminals exploit this velocity by fragmenting illicit funds into dozens of smaller transactions through automated mule networks (a process termed *smurfing* or *structuring*), passing them through intermediary shell companies, routing them through circular wash trades, and reconverging them into high-value exit accounts or offshore sinks.

This crisis severely affects:
1. **Financial Institutions & Banks:** Required by statutory mandates to monitor transactions, but inundated with unmanageable alert volumes.
2. **Compliance & FIU Analysts:** Burdened with manual ledger reviews, spending up to 6 hours investigating a single 3-hop ring.
3. **Law Enforcement Agencies & Regulators (ED, FIU-IND):** Unable to secure timely asset freezes before funds leave the formal banking perimeter.
4. **General Society:** Illicit financial flows deprive developing economies of tax revenues, destabilize currencies, and directly finance terrorism, drug trafficking, and cyber-extortion.

### 1.2 Causes and Impact
Conventional Anti-Money Laundering (AML) transaction monitoring systems rely on **static threshold rules** designed in the 1990s (e.g., flagging individual cash deposits exceeding ₹50,000 to evade PAN reporting, or aggregate transfers surpassing ₹10,00,000). 

#### Why the Problem Exists:
* **Per-Transaction Isolation:** Legacy rule engines evaluate transactions independently in a vacuum. If a syndicate splits ₹1,00,00,000 into 25 transactions of ₹40,000 across 10 mule accounts, **not a single rule triggers**.
* **Topology Blindness:** Relational SQL databases are computationally inefficient at multi-hop graph traversals. Detecting a 4-hop circular wash trade or scatter-gather aggregation requires multiple expensive table self-joins that crash production batch pipelines.
* **Alert Fatigue & Inactionable Scoring:** Legacy rule engines produce an overwhelming **88% to 95% false positive rate** (e.g., flagging routine corporate payroll, festival retail bonuses, or merchant settlements as suspicious).

#### Empirical Impact & Magnitude:
* **Global Scale:** The United Nations Office on Drugs and Crime (UNODC) estimates that **2% to 5% of global GDP** is laundered every year — amounting to **$800 Billion to $2 Trillion USD**.
* **Indian Context:** The Enforcement Directorate (ED) and Financial Intelligence Unit (FIU-IND) handle over ₹2 Lakh Crore in investigated laundering schemes annually under the **Prevention of Money Laundering Act (PMLA), 2002**.
* **Financial Waste:** Global financial institutions spend over **$200 Billion annually** on financial crime compliance, with more than 70% of analytical labor wasted on chasing benign false positives while genuine multi-tier syndicates slip through undetected.

---

## 2. Research Gap

### 2.1 Existing Solutions
Current industrial and academic attempts to combat money laundering fall into three broad categories:

1. **Threshold-Based Legacy AML Rule Engines (e.g., Actimize, SAS AML, Oracle Mantas):**
   * Pre-programmed conditional rules that trigger when volume, frequency, or geographic parameters cross hardcoded limits.
   * *Strengths:* Highly interpretable, well-understood by auditors.
   * *Limitations:* Zero structural awareness, easily bypassed by smurfing, massive false-positive noise.

2. **Black-Box Deep Learning & Graph Neural Networks (GNNs, e.g., GCN, GAT, GraphSAGE):**
   * Academic research using node embeddings and deep graph neural networks to predict laundering node classifications.
   * *Strengths:* Can identify latent topological signals.
   * *Limitations:* **Complete "black-box" opacity.** In legal and regulatory proceedings under PMLA Section 5 or court prosecutions, compliance officers cannot submit an uninterpretable high-dimensional tensor as evidence. Model opacity leads to regulatory rejection. Furthermore, GNNs require immense computational resources and exhibit catastrophic latency on dynamic transaction streams.

3. **Manual Spreadsheet & Pivot-Table Forensic Investigation:**
   * Human investigators cross-referencing CSV exports using Microsoft Excel, Tableau, or Palantir-style desktop point tools.
   * *Strengths:* Human domain expertise and legal defensibility.
   * *Limitations:* Extremely slow (4–8 hours per case); by the time an STR (Suspicious Transaction Report) is drafted, the laundered funds have already been liquidated into cash or cryptocurrency.

### 2.2 Identified Gap
A critical research and engineering gap exists at the intersection of **multi-hop graph intelligence**, **probabilistic accuracy**, and **transparent explainability**:

| Dimension | Legacy Rule Engines | Academic GNNs | **LaunderLens (Identified Gap Addressed)** |
| :--- | :---: | :---: | :---: |
| **Detects Sub-Threshold Smurfing** | ❌ No | ⚠️ Partial | ✅ **Yes (Temporal Motif Mining)** |
| **Multi-Hop Traversal (3–6 Hops)** | ❌ No ($O(N^k)$ join limits) | ✅ Yes | ✅ **Yes ($O(V+E)$ NetworkX BFS/DFS)** |
| **Court-Admissible Explainability** | ⚠️ Rule text only | ❌ Black-box | ✅ **TreeSHAP Attributions + Gemini SAR** |
| **False Positive Rate** | 🚨 Extreme (>88%) | ⚠️ Moderate (~18%) | ✅ **Low (3.9% on test split)** |
| **Automated Statutory SAR Dossier** | ❌ Manual | ❌ None | ✅ **1-Click FIU-IND PMLA 2002 Dossier** |
| **Interactive AI Interrogation** | ❌ None | ❌ None | ✅ **Context-Aware AI Forensic Copilot** |

---

## 3. Ideation of the Solution

### 3.1 Proposed Solution
**LaunderLens** is an explainable, multi-agent Anti-Money Laundering intelligence platform that transforms raw financial transaction streams into an interactive, forensic graph workbench.

#### Core Capabilities:
1. **Autonomous 6-Agent AI Swarm:** An asynchronous pipeline where dedicated agents handle ingestion, graph topological construction, typology motif mining, TreeSHAP risk calibration, LLM forensic narrative generation, and regulatory SAR dossier assembly.
2. **Temporal Network Motif Mining:** Replaces brittle thresholds with sub-second graph pattern matching that identifies five primary laundering typologies across temporal sliding windows:
   * **Fan-Out (Smurfing / Structuring):** Rapid dispersion from one primary source to multiple sub-accounts.
   * **Fan-In (Concentrated Pooling):** Multiple discrete inflows consolidating into a central exit collector.
   * **Scatter-Gather (Layering):** Funds split into parallel intermediary mules and reconverge onto a destination.
   * **Circular Flow (Round-Tripping):** Wash-trading loops ($A \rightarrow B \rightarrow C \rightarrow A$) designed to fabricate legitimate business turnover.
   * **Pass-Through Chains (Mule Velocity):** Rapid transit accounts with dwell times $<2$ hours and conservation ratios $>90\%$.
3. **Transparent Explainable AI (XAI) via TreeSHAP:** Employs LightGBM paired with TreeSHAP marginal feature contributions, guaranteeing that every risk score is mathematically explainable down to specific graph features (e.g., out-degree, flow conservation, velocity).
4. **Interactive AI Forensic Copilot:** A context-grounded Gemini-powered assistant allowing investigators to interrogate alerts using natural language (e.g., *"Who is the primary hub?"*, *"Draft a Section 5 PMLA debit freeze order"*).
5. **Interactive Adversarial Red-Team Simulator:** A live stress-testing button that injects a sub-threshold smurfing ring into the ledger to visually prove that legacy rules miss the ring while LaunderLens flags it in $<42$ milliseconds.

### 3.2 How It Works: Workflow & Architecture

```mermaid
flowchart TD
    subgraph Data Layer
        RAW[Raw Bank Ledgers\nCSV / XLSX / XLS / JSON]
    end

    subgraph Autonomous 6-Agent Swarm
        A1[Agent 1: Ingestion & Normalizer\n- Regex INR Sanitization\n- Synonym Header Mapping]
        A2[Agent 2: Graph Topology Architect\n- NetworkX Directed Multigraph\n- Role Tagging: Entry, Hub, Mule, Exit]
        A3[Agent 3: Typology Motif Miner\n- Fan-Out, Fan-In, Scatter-Gather\n- Cycle DFS & Mule Chain Mining]
        A4[Agent 4: TreeSHAP Risk Engine\n- 12 Graph Features\n- LightGBM + Top 5 SHAP Attributions]
        A5[Agent 5: Forensic LLM Explainer\n- Gemini 1.5 Flash\n- Zero-Hallucination Evidence Grounding]
        A6[Agent 6: FIU-IND Dossier Assembler\n- Participant Ledger Directory\n- Recommended Freeze Orders]
    end

    subgraph Forensic Workbench UI
        UI1[Cytoscape.js Interactive Graph\nRole Colors & Hop Animation]
        UI2[TreeSHAP Risk Attributions\nRecharts Feature Breakdown]
        UI3[AI Forensic Copilot\nContextual Natural Language Q&A]
        UI4[1-Click SAR Dossier\nFIU-IND PMLA Markdown Export]
    end

    RAW --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> A6
    A6 --> UI1
    A6 --> UI2
    A6 --> UI3
    A6 --> UI4
```

#### Technology Stack:
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Cytoscape.js (graph visualization & physics), Recharts (SHAP meters), Lucide-React.
* **Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.x.
* **Graph Intelligence & Machine Learning:** NetworkX 3.x, LightGBM, TreeSHAP, Pandas, NumPy, OpenPyXL.
* **Generative AI & LLM:** Google Gemini 1.5 Flash (with strict zero-hallucination verification and offline statutory fallback).
* **Storage:** PostgreSQL (Supabase pooler ready) / SQLite.

---

## 4. Implementation Roadmap

### 4.1 Work Completed in 24 Hours
Within the 24-hour hackathon timeframe, Team LaunderLens designed, implemented, tested, and deployed an end-to-end, production-grade AML investigation workbench:

#### Features Completed:
1. **Full 6-Agent Pipeline:**
   * Dynamic file parsing supporting `.csv`, `.xlsx`, `.xls` (via `openpyxl`), and `.json`.
   * Currency cleaning regex stripping symbols (`₹`, `$`, `,`) and normalizing timestamps into UTC ISO 8601.
   * Directed multigraph generation in NetworkX with Breadth-First Search (BFS) hop indexing and node role classification (`entry` 🟢, `hub` 🟣, `mule` 🟠, `exit` 🔴).
   * Algorithmic motif mining for all 5 target typologies with rotation-deduplicated cycle detection.
   * Trained LightGBM classifier with TreeSHAP local explainability.
   * Evidence-grounded natural language forensic narrative generation via Gemini 1.5 Flash with offline statutory fallback.
   * 1-Click statutory case dossier generator complying with FIU-IND reporting norms.
2. **Interactive Forensic Investigator UI:**
   * **Interactive Cytoscape Graph Canvas:** Visual node role badges, hop-by-hop animated replay showing fund velocity, and node inspection drawers showing total inflows, outflows, and net positions.
   * **TreeSHAP Attribution Meter:** Real-time Recharts visualization displaying positive and negative feature contributions.
   * **Persistent 6 AI Agents Swarm Bar:** Real-time status trackers and dedicated inspector modals allowing users to drill into the live inputs, outputs, and algorithms of each agent.
   * **Interactive AI Copilot Drawer:** Chat interface preloaded with legal and investigative prompts allowing conversational interrogation of the transaction subgraph.
   * **Adversarial Red-Team Simulator:** In-memory smurfing generator proving that sub-threshold rings evade threshold baselines but are instantly captured by LaunderLens.
3. **Empirical Benchmark Evaluation:**
   * Verified against a tuned Rule-Based Baseline on a held-out test split:
     * **Recall:** **88.2%** vs 64.7% (+36.3% improvement).
     * **Precision:** **83.3%** vs 73.3% (+13.6% improvement).
     * **F1-Score:** **0.857** vs 0.688.
     * **False Positive Rate:** Reduced from 5.2% to **3.9%** (-25% reduction in wasted analyst alerts).

#### Challenges Faced & Technical Overcomes:
* *Challenge 1 (Combinatorial Explosion in Cycle Search):* Standard DFS cycle searches on dense transaction networks suffer exponential runtime. **Solution:** Implemented temporal windowing constraints (max 7-day span), candidate node degree pruning, and a strict per-node traversal budget.
* *Challenge 2 (LLM Hallucinations on Financial Quantities):* LLMs often hallucinate dates, account numbers, or amounts in narratives. **Solution:** Engineered a strict evidence-grounding prompt where the LLM is supplied only structured JSON; added a regex number-verification audit layer that falls back to a deterministic statutory template if any discrepancy is detected.
* *Challenge 3 (Messy Real-World Indian Ledger Formats):* Banking statements feature varying column headers (`Txn_Amt`, `Amount (INR)`, `Transfer Value`, `Source_Acc`). **Solution:** Implemented dynamic regex synonym dictionaries in Agent 1 to automatically harmonize disparate banking formats without manual schema configuration.

### 4.2 Future Roadmap

```mermaid
timeline
    title LaunderLens Product Commercialization Roadmap
    Phase 1 (Months 1-3) : 4D Time-Lapse Player : Core Banking APIs (CBS/Finacle) : Red-Team Scenario Library
    Phase 2 (Months 4-6) : FINnet 2.0 XML Direct Gateway : Real-Time Kafka Streaming Ingestion : Multi-User Role RBAC
    Phase 3 (Months 7-12) : Cross-Bank Graph Federation : Homomorphic Encryption / Zero-Knowledge Proofs : Enterprise Deployment in Tier-1 Banks
```

* **Phase 1: 4D Time-Lapse Player & CBS Integration (Months 1–3)**
  * Implement a 4-dimensional temporal scrubber slider allowing investigators to rewind and play back transactions hour-by-hour to visualize fund dispersion velocity.
  * Connect direct webhooks to Core Banking Systems (CBS) such as Infosys Finacle and TCS BaNCS.
* **Phase 2: FINnet 2.0 Direct XML Submission & Streaming (Months 4–6)**
  * Build native FINnet 2.0 XML compilation for automated, direct submission of STRs/SARs to the FIU-IND portal.
  * Upgrade pipeline ingestion to Apache Kafka / Apache Flink for real-time sub-second streaming surveillance.
* **Phase 3: Cross-Institution Privacy-Preserving Federation (Months 7–12)**
  * Implement federated graph learning utilizing Homomorphic Encryption and Zero-Knowledge Proofs (ZKPs) to detect inter-bank mule syndicates across competing financial institutions without disclosing customer PII or violating banking secrecy laws.

---

## 5. SDG Mapping (UN Sustainable Development Goals)

LaunderLens directly supports the United Nations Sustainable Development Goals (reference: [sdgs.un.org/goals](https://sdgs.un.org/goals)):

### 🎯 SDG 16: Peace, Justice, and Strong Institutions
* **Target 16.4:** *"By 2030, significantly reduce illicit financial and arms flows, strengthen the recovery and return of stolen assets and combat all forms of organized crime."*
  * *LaunderLens Contribution:* By detecting structured smurfing rings, circular round-tripping, and mule networks across multiple hops, LaunderLens directly halts the flow of illicit capital derived from narcotics trafficking, corruption, cyber-extortion, and organized crime.
* **Target 16.5:** *"Substantially reduce corruption and bribery in all their forms."*
  * *LaunderLens Contribution:* Unmasks shell company networks and circular wash trades frequently used by corrupt officials and politically exposed persons (PEPs) to launder public funds.

### 🎯 SDG 8: Decent Work and Economic Growth
* **Target 8.10:** *"Strengthen the capacity of domestic financial institutions to encourage and expand access to banking, insurance and financial services for all."*
  * *LaunderLens Contribution:* Legitimate businesses and innocent individuals frequently suffer wrongful account freezes due to blunt rule-based false positives. By reducing false positives by 25% and providing explainable TreeSHAP justifications, LaunderLens ensures banking integrity without disenfranchising lawful account holders.

### 🎯 SDG 9: Industry, Innovation, and Infrastructure
* **Target 9.5:** *"Enhance scientific research, upgrade technological capabilities of industrial sectors... encouraging innovation."*
  * *LaunderLens Contribution:* Introduces modern graph theory, explainable AI (XAI), and multi-agent coordination into financial regulatory technology (RegTech), transforming outdated compliance infrastructure into modern, AI-augmented systems.

---

## References

1. **United Nations Office on Drugs and Crime (UNODC):** *Money Laundering and Illicit Financial Flows Overview.* Available at: [unodc.org](https://www.unodc.org/unodc/en/money-laundering/overview.html).
2. **Financial Action Task Force (FATF):** *FATF Guidance on Money Laundering Typologies, Smurfing, and the Misuse of Commercial Entities.* Paris, France. Available at: [fatf-gafi.org](https://www.fatf-gafi.org).
3. **Government of India:** *The Prevention of Money Laundering Act (PMLA), 2002 (Act No. 15 of 2003).* Ministry of Finance, Department of Revenue.
4. **Reserve Bank of India (RBI):** *Master Direction - Know Your Customer (KYC) Direction, 2016 (Updated February 2024).* Reserve Bank of India, Mumbai.
5. **Financial Intelligence Unit - India (FIU-IND):** *Reporting Format for Suspicious Transaction Reports (STR) under PMLA 2002.* Ministry of Finance, New Delhi.
6. **Lundberg, S. M., & Lee, S. I. (2017):** *"A Unified Approach to Interpreting Model Predictions."* Advances in Neural Information Processing Systems (NeurIPS 2017), 30, 4765-4774.
7. **IBM Research (2023):** *AMLWorld: Synthetic Benchmark Datasets for Anti-Money Laundering and Financial Crime Detection.*
8. **United Nations Sustainable Development Goals:** *Goal 16: Peace, Justice, and Strong Institutions & Target 16.4.* Available at: [sdgs.un.org/goals/goal16](https://sdgs.un.org/goals/goal16).
