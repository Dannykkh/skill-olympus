# Mermaid Diagram Patterns Reference

mermaid-diagram-specialist 에이전트의 다이어그램 유형별 상세 예시 모음.

## Flowchart

### Syntax

```mermaid
flowchart TD
    Start([Start]) --> Input[/User Input/]
    Input --> Validate{Valid?}
    Validate -->|Yes| Process[Process Data]
    Validate -->|No| Error[Show Error]
    Error --> Input
    Process --> Save[(Save to DB)]
    Save --> Success[/Success Response/]
    Success --> End([End])
```

### Node Shapes

- `[Rectangle]` - Process step
- `([Rounded])` - Start/End
- `{Diamond}` - Decision
- `[/Parallelogram/]` - Input/Output
- `[(Database)]` - Data storage
- `((Circle))` - Connector

### Direction Options

- `TD` - Top to Down
- `LR` - Left to Right
- `BT` - Bottom to Top
- `RL` - Right to Left

### Example - Booking Flow

```mermaid
flowchart TD
    Start([User Initiates Booking]) --> CheckDates[Check Date Availability]
    CheckDates --> Available{Dates Available?}
    Available -->|No| ShowError[/Show Unavailable Message/]
    ShowError --> End([End])
    Available -->|Yes| CreateBooking[Create Pending Booking]
    CreateBooking --> Payment[Process Payment]
    Payment --> PaymentSuccess{Payment Success?}
    PaymentSuccess -->|No| CancelBooking[Cancel Booking]
    CancelBooking --> ShowError
    PaymentSuccess -->|Yes| ConfirmBooking[Confirm Booking]
    ConfirmBooking --> SendEmail[/Send Confirmation Email/]
    SendEmail --> SaveDB[(Save to Database)]
    SaveDB --> Success[/Show Success/]
    Success --> End
```

## Sequence Diagram

### Syntax

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant DB
    participant Payment

    User->>Frontend: Click "Book"
    Frontend->>API: POST /api/bookings
    API->>DB: Check availability
    DB-->>API: Available
    API->>Payment: Process payment
    Payment-->>API: Payment successful
    API->>DB: Create booking
    DB-->>API: Booking created
    API-->>Frontend: 201 Created
    Frontend-->>User: Show confirmation
```

### Participant Types

- `actor` - Human user
- `participant` - System/Service
- `database` - Database

### Arrow Types

- `->` - Solid line (synchronous)
- `-->` - Dotted line (response)
- `->>` - Solid arrow (async message)
- `-->>` - Dotted arrow (async response)

### Example - Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant Clerk
    participant DB

    User->>Frontend: Enter credentials
    Frontend->>Clerk: Login request
    Clerk->>Clerk: Validate credentials
    alt Credentials valid
        Clerk-->>Frontend: JWT token
        Frontend->>API: Request with token
        API->>Clerk: Verify token
        Clerk-->>API: Token valid
        API->>DB: Fetch user data
        DB-->>API: User data
        API-->>Frontend: User session
        Frontend-->>User: Logged in
    else Credentials invalid
        Clerk-->>Frontend: Auth error
        Frontend-->>User: Show error
    end
```

## ERD (Entity Relationship Diagram)

### Syntax

```mermaid
erDiagram
    USER ||--o{ BOOKING : creates
    ACCOMMODATION ||--o{ BOOKING : "booked for"
    USER {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    BOOKING {
        uuid id PK
        uuid user_id FK
        uuid accommodation_id FK
        date check_in
        date check_out
        enum status
    }
    ACCOMMODATION {
        uuid id PK
        string name
        text description
        decimal price_per_night
    }
```

### Relationship Types

- `||--||` - One to one
- `||--o{` - One to many
- `}o--o{` - Many to many
- `||--o|` - One to zero or one

### Cardinality Symbols

- `||` - Exactly one
- `o|` - Zero or one
- `}o` - Zero or more
- `}|` - One or more

### Example - Full ERD

```mermaid
erDiagram
    USER ||--o{ BOOKING : creates
    USER ||--o{ REVIEW : writes
    USER ||--o{ ACCOMMODATION : owns
    ACCOMMODATION ||--o{ BOOKING : "has bookings"
    ACCOMMODATION ||--o{ REVIEW : "has reviews"
    ACCOMMODATION }o--o{ AMENITY : includes
    BOOKING ||--|| PAYMENT : "has payment"

    USER {
        uuid id PK
        string clerk_id UK
        string email UK
        string name
        enum role
        timestamp created_at
    }

    ACCOMMODATION {
        uuid id PK
        uuid owner_id FK
        string name
        text description
        decimal price_per_night
        int max_guests
        enum status
    }

    BOOKING {
        uuid id PK
        uuid user_id FK
        uuid accommodation_id FK
        date check_in
        date check_out
        int guests
        enum status
        decimal total_price
    }

    REVIEW {
        uuid id PK
        uuid user_id FK
        uuid accommodation_id FK
        int rating
        text comment
        timestamp created_at
    }

    PAYMENT {
        uuid id PK
        uuid booking_id FK
        string mercadopago_id UK
        decimal amount
        enum status
        timestamp processed_at
    }

    AMENITY {
        uuid id PK
        string name
        string icon
    }
```

## C4 Architecture Diagrams

### Context Level (System in environment)

```mermaid
C4Context
    title System Context - Hospeda Platform

    Person(guest, "Guest", "Tourist looking for accommodation")
    Person(owner, "Owner", "Accommodation owner")
    System(hospeda, "Hospeda Platform", "Tourism booking platform")

    System_Ext(clerk, "Clerk", "Authentication provider")
    System_Ext(mercadopago, "Mercado Pago", "Payment processor")
    System_Ext(email, "Email Service", "Transactional emails")

    Rel(guest, hospeda, "Searches and books", "HTTPS")
    Rel(owner, hospeda, "Manages listings", "HTTPS")
    Rel(hospeda, clerk, "Authenticates users", "API")
    Rel(hospeda, mercadopago, "Processes payments", "API")
    Rel(hospeda, email, "Sends notifications", "SMTP")
```

### Container Level (Applications and data stores)

```mermaid
C4Container
    title Container - Hospeda Platform

    Person(user, "User")

    Container(web, "Web App", "Astro + React", "Public-facing website")
    Container(admin, "Admin Panel", "TanStack Start", "Management interface")
    Container(api, "API", "Hono", "Backend services")
    ContainerDb(db, "Database", "PostgreSQL", "Stores all data")

    Rel(user, web, "Uses", "HTTPS")
    Rel(user, admin, "Manages", "HTTPS")
    Rel(web, api, "Calls", "JSON/HTTPS")
    Rel(admin, api, "Calls", "JSON/HTTPS")
    Rel(api, db, "Reads/Writes", "SQL")
```

### Component Level (Internal structure)

```mermaid
C4Component
    title Components - API Application

    Container(api, "API", "Hono")

    Component(routes, "Routes", "Hono Router", "HTTP endpoints")
    Component(services, "Services", "Business Logic", "Domain operations")
    Component(models, "Models", "Data Access", "DB operations")
    Component(middleware, "Middleware", "Cross-cutting", "Auth, logging, errors")

    Rel(routes, middleware, "Uses")
    Rel(routes, services, "Calls")
    Rel(services, models, "Uses")
    Rel(models, db, "Queries")
```

## State Diagram

### Syntax

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Confirmed : Payment Success
    Pending --> Cancelled : Payment Failed
    Pending --> Cancelled : User Cancels
    Confirmed --> CheckedIn : Check-in Date
    Confirmed --> Cancelled : Cancellation Request
    CheckedIn --> CheckedOut : Check-out Date
    CheckedOut --> Reviewed : User Submits Review
    CheckedOut --> [*] : 30 Days Elapsed
    Reviewed --> [*]
    Cancelled --> [*]
```

### Example - Booking Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft : Create Booking

    state "Pending Payment" as Pending
    state "Payment Processing" as Processing

    Draft --> Pending : Submit Booking
    Pending --> Processing : Initiate Payment

    Processing --> Confirmed : Payment Approved
    Processing --> PaymentFailed : Payment Declined

    PaymentFailed --> Pending : Retry Payment
    PaymentFailed --> Cancelled : Max Retries

    Confirmed --> Active : Check-in Date Reached
    Active --> Completed : Check-out Date Reached

    Confirmed --> CancelRequested : Cancellation Request
    CancelRequested --> RefundProcessing : Approve Cancellation
    RefundProcessing --> Cancelled : Refund Complete

    Completed --> [*]
    Cancelled --> [*]

    note right of Confirmed
        Owner notified
        Calendar blocked
    end note

    note right of Completed
        Review requested
        Payment released
    end note
```

## Styling and Customization

### Theme Application

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor':'#3B82F6',
  'primaryTextColor':'#fff',
  'primaryBorderColor':'#2563EB',
  'lineColor':'#6B7280',
  'secondaryColor':'#10B981',
  'tertiaryColor':'#F59E0B'
}}}%%
flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
```

### Class Styling

```mermaid
flowchart TD
    A[Normal] --> B[Success]
    B --> C[Error]

    classDef successClass fill:#10B981,stroke:#059669,color:#fff
    classDef errorClass fill:#EF4444,stroke:#DC2626,color:#fff

    class B successClass
    class C errorClass
```

## Common Patterns

### API Request Flow

```mermaid
sequenceDiagram
    Client->>+API: GET /resource
    API->>+Service: fetchResource()
    Service->>+Model: findById()
    Model->>+DB: SELECT query
    DB-->>-Model: Row data
    Model-->>-Service: Entity
    Service-->>-API: DTO
    API-->>-Client: JSON response
```

### Error Handling Flow

```mermaid
flowchart TD
    Request[Incoming Request] --> Validate{Valid?}
    Validate -->|No| ValidationError[Validation Error]
    ValidationError --> ErrorHandler[Error Handler]
    Validate -->|Yes| Process[Process Request]
    Process --> DB{DB Success?}
    DB -->|No| DBError[Database Error]
    DBError --> ErrorHandler
    DB -->|Yes| Success[Success Response]
    ErrorHandler --> LogError[Log Error]
    LogError --> ErrorResponse[Error Response]
```
