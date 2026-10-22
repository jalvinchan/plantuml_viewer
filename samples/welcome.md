# Markdown & PlantUML Live Studio

Welcome to **Markdown + PlantUML Live Studio**! This application renders standard GitHub-flavored Markdown alongside interactive **PlantUML diagrams**.

---

## 1. Sequence Diagram: Authentication Flow

PlantUML diagrams inside markdown code blocks (```` ```plantuml ```` or ```` ```puml ````) are automatically rendered to vector SVG:

```plantuml
@startuml
autonumber
actor User as U
participant "Web App" as App
participant "Auth Server" as Auth
database "Session Store" as DB

U -> App: 1. Click Login
activate App
App -> Auth: 2. Redirect with Client ID & Challenge
activate Auth
Auth --> U: 3. Prompt for Credentials
U -> Auth: 4. Submit Username & Password
Auth -> Auth: 5. Verify & Issue Auth Code
Auth --> App: 6. Redirect with Auth Code
deactivate Auth

App -> Auth: 7. Exchange Code for JWT Access Token
activate Auth
Auth --> App: 8. Return Access & Refresh Tokens
deactivate Auth

App -> DB: 9. Save Session
App --> U: 10. Login Complete (Dashboard)
deactivate App
@enduml
```

---

## 2. Architecture & Microservices Diagram

Here is a system component diagram demonstrating cloud services:

```plantuml
@startuml
skinparam componentStyle uml2

package "Client Layer" {
  [Web Browser] as Web
  [Mobile App] as Mobile
}

cloud "Cloud Infrastructure" {
  [API Gateway] as GW
  
  package "Backend Services" {
    [Auth Service] as AuthService
    [Order Service] as OrderService
    [Inventory Service] as InvService
  }
  
  database "PostgreSQL" as DB
  database "Redis Cache" as Cache
  queue "Kafka Event Bus" as Bus
}

Web --> GW : HTTPS
Mobile --> GW : HTTPS

GW --> AuthService : Validate Token
GW --> OrderService : Route Orders
GW --> InvService : Check Inventory

AuthService ..> Cache : Token Cache
OrderService --> DB : CRUD Operations
OrderService --> Bus : OrderCreated Event
InvService <.. Bus : Consume Events
@enduml
```

---

## 3. Class Diagram

Object-oriented design with inheritance and interfaces:

```plantuml
@startuml
interface Shape {
  +calculateArea() : double
  +calculatePerimeter() : double
}

abstract class Polygon {
  #numberOfSides : int
  +getNumberOfSides() : int
}

class Rectangle {
  -width : double
  -height : double
  +calculateArea() : double
  +calculatePerimeter() : double
}

class Circle {
  -radius : double
  +calculateArea() : double
  +calculatePerimeter() : double
}

Polygon ..|> Shape
Rectangle --|> Polygon
Circle ..|> Shape
@enduml
```

---

## 4. Mindmap / Brainstorming

PlantUML also natively supports mindmaps (`@startmindmap`):

```plantuml
@startmindmap
* Modern Web App
** Frontend
*** Single Page App
*** Web Components
*** Responsive Design
** Backend
*** REST & GraphQL APIs
*** Event-Driven Microservices
*** Distributed Caching
** DevOps
*** CI/CD Automation
*** Containerization (Docker/K8s)
*** Observability (Tracing, Metrics)
@endmindmap
```

---

## 5. Standard Markdown & Code Highlighting

Tables, lists, and syntax highlighting work seamlessly:

### Feature Matrix

| Feature | Supported | Notes |
| :--- | :---: | :--- |
| **PlantUML Diagrams** | ✅ | Rendered as SVG / PNG via configurable server |
| **Zoom & Pan Modal** | ✅ | Click Zoom on any diagram |
| **Download & Export** | ✅ | Download SVG / PNG, Export standalone HTML |
| **Theme Switching** | ✅ | Light / Dark mode support |
| **GFM Syntax** | ✅ | Tables, Task lists, Strikethrough, Code blocks |

### Code Example (Go)

```go
package main

import (
    "fmt"
    "net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, PlantUML!")
}

func main() {
    http.HandleFunc("/", helloHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Task Checklist

- [x] Integrate Marked parser
- [x] Support PlantUML 64 deflate encoding
- [x] Zoom and Pan lightbox
- [x] Dark / Light theme toggle
- [x] Export to standalone HTML
