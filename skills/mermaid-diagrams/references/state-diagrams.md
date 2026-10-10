# State Diagrams

State diagrams show the lifecycle of one thing — an order, a booking, a payment, a ticket — as the states it can be in and the events that move it between them. Use one when an entity has a status field and at least three transitions; for a step-by-step process with no persistent status, use a flowchart instead.

## Basic Syntax

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Paid : customer pays
    Pending --> Cancelled : customer cancels
    Paid --> Shipped : warehouse ships
    Shipped --> [*]
    Cancelled --> [*]
```

- `stateDiagram-v2` selects the current renderer. Prefer it over the older `stateDiagram`.
- `[*]` is the start state when it is on the left of an arrow and an end state when it is on the right.
- `A --> B : label` is a transition. Write the label as the trigger, and name who or what causes it when roles matter (`Pending --> Paid : customer pays`).

## Naming States

State IDs cannot contain spaces. Give a readable label with an alias:

```mermaid
stateDiagram-v2
    state "Awaiting payment" as Pending
    state "Payment failed" as Failed
    [*] --> Pending
    Pending --> Failed : card declined
    Failed --> Pending : customer retries
```

A description can also be attached to an existing ID: `Pending : waiting for the payment gateway`.

## Composite States

Group the internal steps of one state inside braces. The inner `[*]` markers belong to the composite state only.

```mermaid
stateDiagram-v2
    [*] --> Fulfilment
    state Fulfilment {
        [*] --> Picking
        Picking --> Packing
        Packing --> [*]
    }
    Fulfilment --> Shipped
    Shipped --> [*]
```

## Choice, Fork and Join

```mermaid
stateDiagram-v2
    state stock_check <<choice>>
    [*] --> Ordered
    Ordered --> stock_check
    stock_check --> Backordered : out of stock
    stock_check --> Reserved : in stock

    state split <<fork>>
    state merge <<join>>
    Reserved --> split
    split --> Invoicing
    split --> Packing
    Invoicing --> merge
    Packing --> merge
    merge --> Shipped
    Shipped --> [*]
    Backordered --> [*]
```

- `<<choice>>` branches on a condition; put the condition on each outgoing label.
- `<<fork>>` / `<<join>>` split work into parallel paths and wait for all of them.

## Concurrent Regions

Inside a composite state, `--` separates regions that run at the same time:

```mermaid
stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Unpaid
        Unpaid --> Paid
        --
        [*] --> Unshipped
        Unshipped --> Shipped
    }
```

## Notes

```mermaid
stateDiagram-v2
    [*] --> Confirmed
    Confirmed --> [*]
    note right of Confirmed
        Customer notified
        Stock reserved
    end note
```

A single-line note uses `note left of Confirmed : stock reserved`.

## Direction and Styling

```mermaid
stateDiagram-v2
    direction LR
    classDef failed fill:#fde2e2,stroke:#c0392b,color:#7b241c
    [*] --> Pending
    Pending --> Paid
    Pending --> Rejected
    Rejected:::failed --> [*]
    Paid --> [*]
```

- `direction LR` (or `TB`) sets the layout direction for the diagram or for one composite state.
- `classDef` plus `:::className` (or `class StateId className`) styles states. Classes cannot be applied to start/end markers or to (or inside) composite states.

## Complete Example: Order Lifecycle

```mermaid
stateDiagram-v2
    state "Awaiting payment" as Pending
    state "Payment failed" as PaymentFailed
    state "Refund in progress" as Refunding

    [*] --> Pending : customer places order
    Pending --> Paid : payment approved
    Pending --> PaymentFailed : payment declined
    PaymentFailed --> Pending : customer retries
    PaymentFailed --> Cancelled : retry limit reached

    Paid --> Shipped : warehouse ships
    Shipped --> Delivered : carrier confirms
    Paid --> Refunding : customer cancels before shipping
    Refunding --> Cancelled : refund completed

    Delivered --> [*]
    Cancelled --> [*]

    note right of Paid
        Stock reserved
        Confirmation email sent
    end note
```

## Best Practices

1. **One entity per diagram** — a diagram that mixes an order's and a payment's states hides who owns which transition.
2. **Label every transition** with its trigger, and with the role that may cause it when permissions differ.
3. **Make every path end** — each state should reach `[*]` or be an intentional resting state, so missing transitions are visible.
4. **Match the code** — state names should be the values stored in the status field, so the diagram can be checked against the implementation.
5. **Use aliases for readable labels** instead of putting spaces in IDs.
