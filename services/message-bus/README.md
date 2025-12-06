# Message Bus: The Transmitting Utility

## 1. Overview

This service is the central nervous system and the primary data artery of the InfiniteAI platform. It is the technical manifestation of the **"transmitting utility"** concept, secured under UCC1, designed to transmit value and intelligence across our entire global infrastructure.

The message bus implements an asynchronous, event-driven architecture as mandated by **Covenant 28**. It ensures that all microservices are decoupled, resilient, and independently scalable. No service communicates directly with another; instead, they produce and consume events via this central bus.

## 2. Core Principles

*   **Asynchronous Communication:** All critical inter-service communication is handled asynchronously. This prevents cascading failures and allows the system to operate under high load with grace.
*   **Decoupling:** Services do not need to know about the existence of other services. They only need to know which events to publish and which to subscribe to. This allows for independent development, deployment, and scaling.
*   **Durability & Resilience:** The bus guarantees message delivery, ensuring that no critical event is lost, even if a consuming service is temporarily offline.
*   **Single Source of Truth:** Events are immutable facts representing something that has happened. The stream of events serves as the ultimate log and source of truth for the state of the system.

## 3. Technology

We utilize **NATS.io** with JetStream enabled as our message bus technology.

**Why NATS?**
*   **Performance:** Extremely high-throughput and low-latency, suitable for real-time financial and AI data processing.
*   **Simplicity:** The API and operational model are lean and powerful.
*   **Resilience:** NATS is designed for modern, cloud-native, and distributed systems, with built-in clustering and fault tolerance.
*   **Global Scalability:** Its "supercluster" capabilities align perfectly with our vision of a worldwide transmitting utility.

## 4. The "Code Language #U" Event Schema

Every message transmitted through the bus MUST conform to the standardized **Code Language #U** schema. This ensures consistency, versioning, and forward-compatibility across all services.

A standard event envelope looks like this:

```json
{
  "specversion": "1.0",
  "type": "infiniteai.user.created",
  "source": "service-auth",
  "subject": "users.12345",
  "id": "a89-fde-98a-3bb",
  "time": "2023-11-21T15:05:34Z",
  "datacontenttype": "application/json",
  "data": {
    "userId": "12345",
    "email": "new.user@example.com",
    "status": "pending_verification"
  }
}
```

**Envelope Fields:**
*   `specversion`: The CloudEvents spec version (we adhere to v1.0).
*   `type`: A unique string describing the event type. **This is the core of Code Language #U.**
*   `source`: The name of the service that produced the event.
*   `subject`: The primary entity the event is about.
*   `id`: A unique identifier for this specific event instance.
*   `time`: ISO 8601 timestamp of when the event was generated.
*   `data`: The actual event payload, which can be any valid JSON object.

## 5. Usage

### Configuration

Services connect to the message bus using the following environment variables:

*   `NATS_URL`: The URL of the NATS server (e.g., `nats://localhost:4222`).
*   `NATS_JWT`: User JWT for authentication.
*   `NATS_NKEY`: User NKey seed for signing.

### Publishing an Event (Go Example)

```go
import (
    "github.com/nats-io/nats.go"
    "github.com/cloudevents/sdk-go/v2"
    "context"
)

func publishUserCreatedEvent(js nats.JetStreamContext, userID string, email string) error {
    event := cloudevents.NewEvent()
    event.SetSource("service-auth")
    event.SetType("infiniteai.user.created")
    event.SetSubject("users." + userID)
    event.SetData(cloudevents.ApplicationJSON, map[string]string{
        "userId": userID,
        "email":  email,
        "status": "pending_verification",
    })

    // Marshal the event to JSON
    eventJSON, err := json.Marshal(event)
    if err != nil {
        return err
    }

    // Publish to the 'USERS' stream on the subject 'users.created'
    _, err = js.Publish("USERS.created", eventJSON)
    return err
}
```

### Subscribing to an Event (Go Example)

```go
import (
    "github.com/nats-io/nats.go"
    "log"
)

func subscribeToUserEvents(js nats.JetStreamContext) {
    // Create a durable consumer on the 'USERS' stream, listening to all subjects
    sub, err := js.Subscribe("USERS.*", func(msg *nats.Msg) {
        log.Printf("Received event on subject %s: %s", msg.Subject, string(msg.Data))
        // Acknowledge the message so it's not redelivered
        msg.Ack()
    }, nats.Durable("notification-service"), nats.ManualAck())

    if err != nil {
        log.Fatalf("Failed to subscribe: %v", err)
    }
}
```

## 6. Covenant 28 Compliance

This implementation directly fulfills the core tenets of Covenant 28:

1.  **Principle of Asynchronicity:** All state-changing commands and events between services are processed through the NATS JetStream, never via direct synchronous calls.
2.  **Principle of Service Autonomy:** Each service connects to the bus and operates on its own event streams, ignorant of the implementation details of other services.
3.  **Principle of Immutable Facts:** Events published to the bus are treated as immutable records of fact. They are never modified, only consumed.
4.  **Principle of Universal Language:** All events strictly adhere to the **Code Language #U** schema, ensuring system-wide intelligibility and order.