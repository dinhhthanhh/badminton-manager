# ShuttleHub — System Architecture Documentation

## High-Level System Design

```
+-------------------------------------------------------------------+
|                        Client Layer                               |
|   Next.js 15/16 App Router (React Server & Client Components)    |
|   Responsive UI: Sidebar (Desktop) / Bottom Navigation (Mobile)   |
+-------------------------------------------------------------------+
                                 │
                                 ▼
+-------------------------------------------------------------------+
|                       Middleware Layer                            |
|  - Route Protection & Authentication Guard                        |
|  - Session Refresh via @supabase/ssr                              |
|  - Role-based Access Control (User vs. Admin)                    |
+-------------------------------------------------------------------+
                                 │
                                 ▼
+-------------------------------------------------------------------+
|                      Service / Logic Layer                        |
|  - session.service.ts       (Generation, CRUD, Finalization)     |
|  - cost-calculation.service.ts (Integer math, Rounding algorithms)|
|  - registration.service.ts  (Deadlines, Cancellation rules)       |
|  - payment.service.ts       (Settlement, Proof uploads)          |
|  - email.service.ts         (Resend HTML email notifications)     |
+-------------------------------------------------------------------+
                                 │
                                 ▼
+-------------------------------------------------------------------+
|                      Data & Storage Layer                         |
|  - Supabase PostgreSQL (9 Tables, Indexes, Triggers)              |
|  - Supabase Auth (Google OAuth 2.0 Integration)                   |
|  - Supabase Storage (payment-proofs Bucket)                       |
+-------------------------------------------------------------------+
```

---

## Clean Architecture Principles

1. **Separation of Business Logic**: UI components render interface elements and delegate data mutations to pure service functions (`src/services/`).
2. **Server Actions & SSR**: Data fetching happens on the server where appropriate for security and fast initial page loads.
3. **Integer Currency Math**: Financial calculations never touch floating-point math. Amounts are computed in integer VND using the largest-remainder method.
4. **Timezone Standardization**: All scheduling and deadline math explicitly targets `Asia/Ho_Chi_Minh` timezone.
5. **Decoupled Email Provider**: Email delivery uses an abstraction interface (`sendEmail`), defaulting to Resend with fallback console logging.
