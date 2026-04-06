# Booking Module Workflow (Mermaid Diagram)

Below is a workflow diagram for the **Book Yacht Trip** module (covers Customer flows: direct selection and system-matching, Owner actions, and Admin oversight).  
Paste the Mermaid block into any Markdown viewer that supports Mermaid (e.g., GitHub, Obsidian, VS Code with Mermaid preview) or use a Mermaid live editor.

```mermaid
flowchart LR
  %% Swimlanes via subgraphs
  subgraph CUSTOMER [Customer]
    C1[Start Booking] --> C2{Choose Trip Type}
    C2 --> C3[Day Trip (1 day)]
    C2 --> C4[Long Trip (2-5 days)]
    C3 --> C5{Choose Booking Mode}
    C4 --> C5
    C5 -->|Customer Chooses Yacht| S1
    C5 -->|Let Us Choose (Match)| S6
    C_end1[End - Booking Confirmed] 
  end

  subgraph SYSTEM [System / App]
    S1[Show Yacht List & Filters]
    S2[Display Yacht Details]
    S3[Proceed to Payment]
    S4[Create Booking & Notify Owner]
    S5[Confirm Booking to Customer]
    S6[Collect Preferences & Budget]
    S7[Match Algorithm selects yacht(s)]
    S8[Send Match Request to Owner(s)]
    S9[Handle Rematch (if declined)]
  end

  subgraph OWNER [Yacht Owner (Rayes)]
    O1[Receive Booking Request / Match Offer]
    O2[Accept Booking]
    O3[Decline / Request Reschedule]
    O4[Update Availability Calendar]
  end

  subgraph ADMIN [Admin / Port Manager]
    A1[Verify Owner & Yacht]
    A2[Manage Bookings & Overrides]
    A3[Handle Disputes & Refunds]
  end

  %% Customer direct flow (Scenario 1)
  S1 --> S2
  S2 --> C6[Select Date/Slot & Confirm]
  C6 --> S3
  S3 --> S4
  S4 --> O1
  O1 -->|Accept within time window| O2
  O2 --> S5
  O2 --> C_end1
  O1 -->|Decline| O3
  O3 --> S9
  S9 --> S1

  %% System-match flow (Scenario 2)
  S6 --> S7
  S7 --> S8
  S8 --> O1
  O1 -->|Accept| O2
  O2 --> S5
  O1 -->|Decline| O3
  O3 --> S9
  S9 --> S7

  %% Admin interactions (can occur at multiple points)
  A1 -->|Verify onboarding| OWNER
  A2 --> S4
  A3 --> S5

  %% Owner availability maintenance (background)
  O4 --> S1
  C_end1 -->|Send Receipt & Itinerary| SYSTEM
```

---

**Legend**
- Customer flows: choosing trip type, booking mode (direct vs match).  
- System: listing, matching, payments, notifications.  
- Owner: receives requests, accepts/declines, manages availability.  
- Admin: verifies owners, manages disputes and overrides.

---

*Would you like this exported as a PDF or included in a developer handoff document (with clickable links & coordinates)?*
