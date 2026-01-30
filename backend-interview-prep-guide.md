# Backend Developer Interview Preparation Guide
## From Basic to Advanced Topics

---

## 1️⃣ BASIC LEVEL (Foundation)

### JavaScript Fundamentals
- [ ] **Data Types** - Primitive vs Reference types
- [ ] **Variables** - var, let, const (scope, hoisting)
- [ ] **Functions** - Declaration, Expression, Arrow functions
- [ ] **Callbacks** - Understanding asynchronous callbacks
- [ ] **Array Methods** - map, filter, reduce, forEach, find, some, every
- [ ] **Object Manipulation** - Object.keys, Object.values, destructuring
- [ ] **Template Literals** - String interpolation
- [ ] **Ternary Operators** - Conditional expressions
- [ ] **Truthy/Falsy Values** - Type coercion

### Node.js Basics
- [ ] **What is Node.js?** - Event-driven, non-blocking I/O
- [ ] **CommonJS vs ES Modules** - require vs import/export
- [ ] **NPM Basics** - package.json, node_modules, npm commands
- [ ] **Built-in Modules** - fs, path, http, os, events
- [ ] **Process Object** - process.env, process.argv
- [ ] **Global Objects** - __dirname, __filename, global

### Express.js Fundamentals
- [ ] **Setup & Configuration** - Basic server setup
- [ ] **Routing** - GET, POST, PUT, DELETE, PATCH
- [ ] **Request Object** - req.params, req.query, req.body
- [ ] **Response Object** - res.json(), res.send(), res.status()
- [ ] **Middleware** - What it is, how it works, next()
- [ ] **Static Files** - express.static()
- [ ] **Error Handling** - Basic error middleware

### HTTP Fundamentals
- [ ] **HTTP Methods** - GET, POST, PUT, DELETE, PATCH
- [ ] **Status Codes** - 200, 201, 400, 401, 403, 404, 500, 502, 503
- [ ] **Headers** - Content-Type, Authorization, Accept
- [ ] **Request/Response Cycle** - How HTTP works
- [ ] **REST Principles** - Resource-based URLs, stateless

### Database Basics (MongoDB/SQL)
- [ ] **CRUD Operations** - Create, Read, Update, Delete
- [ ] **Database Connection** - How to connect to DB
- [ ] **Basic Queries** - Find, insert, update, delete
- [ ] **Schema/Models** - Defining data structure
- [ ] **SQL Basics** - SELECT, WHERE, JOIN, INSERT, UPDATE, DELETE (if using SQL)

---

## 2️⃣ INTERMEDIATE LEVEL

### Advanced JavaScript
- [ ] **Promises** - Creating, chaining, error handling
- [ ] **Async/Await** - Syntax, error handling with try-catch
- [ ] **Closures** - Lexical scope, practical use cases
- [ ] **Higher-Order Functions** - Functions that take/return functions
- [ ] **this Keyword** - Context binding, call, apply, bind
- [ ] **Prototypes** - Prototype chain, inheritance
- [ ] **Classes** - ES6 classes, constructor, methods
- [ ] **Modules** - Import/export patterns
- [ ] **Error Handling** - try-catch, custom errors
- [ ] **Spread/Rest Operators** - ... operator uses
- [ ] **Optional Chaining** - ?. operator
- [ ] **Nullish Coalescing** - ?? operator

### Express.js Advanced
- [ ] **Middleware Chain** - Multiple middleware, order matters
- [ ] **Custom Middleware** - Creating reusable middleware
- [ ] **Route Parameters** - Dynamic routes, regex patterns
- [ ] **Router-level Middleware** - express.Router()
- [ ] **Error Handling Middleware** - Centralized error handling
- [ ] **Request Validation** - Input sanitization and validation
- [ ] **CORS** - Cross-Origin Resource Sharing setup
- [ ] **File Uploads** - Multer, handling multipart data
- [ ] **Rate Limiting** - Preventing abuse
- [ ] **Compression** - Response compression

### Authentication & Authorization
- [ ] **JWT (JSON Web Tokens)** - Structure, signing, verification
- [ ] **Session-based Auth** - Sessions vs tokens
- [ ] **Password Hashing** - bcrypt, security best practices
- [ ] **OAuth 2.0** - Third-party authentication basics
- [ ] **Refresh Tokens** - Token rotation strategy
- [ ] **Role-Based Access Control (RBAC)** - User roles, permissions
- [ ] **Middleware Guards** - Protecting routes
- [ ] **Cookies** - Setting, reading, securing cookies

### Database Intermediate
- [ ] **Mongoose (MongoDB)** - Schemas, models, validation, middleware
- [ ] **Indexing** - Performance optimization
- [ ] **Relationships** - One-to-one, one-to-many, many-to-many
- [ ] **Population** - Mongoose populate (joins)
- [ ] **Aggregation** - Pipeline operations
- [ ] **Transactions** - ACID properties
- [ ] **Query Optimization** - Efficient queries
- [ ] **Schema Design** - Best practices, normalization vs denormalization

### API Design
- [ ] **RESTful Best Practices** - Naming conventions, HTTP methods
- [ ] **API Versioning** - /v1/, /v2/ strategies
- [ ] **Pagination** - Limit, offset, cursor-based
- [ ] **Filtering & Sorting** - Query parameters
- [ ] **Response Structure** - Consistent JSON format
- [ ] **HATEOAS** - Hypermedia in responses
- [ ] **API Documentation** - Swagger/OpenAPI

### Security Basics
- [ ] **Input Validation** - Sanitization, XSS prevention
- [ ] **SQL Injection Prevention** - Parameterized queries
- [ ] **HTTPS** - SSL/TLS basics
- [ ] **Environment Variables** - .env files, secrets management
- [ ] **Helmet.js** - Security headers
- [ ] **CSRF Protection** - Cross-Site Request Forgery
- [ ] **Data Encryption** - At rest and in transit

---

## 3️⃣ ADVANCED LEVEL

### Architecture & Design Patterns
- [ ] **MVC Pattern** - Model-View-Controller separation
- [ ] **Layered Architecture** - Controller → Service → Repository
- [ ] **Dependency Injection** - IoC containers
- [ ] **Repository Pattern** - Data access abstraction
- [ ] **Factory Pattern** - Object creation
- [ ] **Singleton Pattern** - Single instance
- [ ] **Observer Pattern** - Event-driven architecture
- [ ] **Strategy Pattern** - Interchangeable algorithms
- [ ] **SOLID Principles** - Single responsibility, Open/closed, etc.
- [ ] **DRY, KISS, YAGNI** - Code quality principles

### Performance Optimization
- [ ] **Caching Strategies** - Redis, in-memory caching
- [ ] **Database Query Optimization** - Indexes, explain plans
- [ ] **Connection Pooling** - Database connection management
- [ ] **Load Balancing** - Horizontal scaling
- [ ] **CDN** - Content Delivery Networks
- [ ] **Compression** - Gzip, Brotli
- [ ] **Lazy Loading** - Data fetching strategies
- [ ] **Memory Management** - Heap, garbage collection
- [ ] **Clustering** - Node.js cluster module
- [ ] **Worker Threads** - CPU-intensive tasks

### Advanced Database
- [ ] **Database Sharding** - Horizontal partitioning
- [ ] **Replication** - Master-slave, master-master
- [ ] **Denormalization** - When and why
- [ ] **CAP Theorem** - Consistency, Availability, Partition tolerance
- [ ] **NoSQL vs SQL** - Use cases, trade-offs
- [ ] **Data Migration** - Strategies and tools
- [ ] **Backup & Recovery** - Best practices
- [ ] **Database Transactions** - Isolation levels
- [ ] **Read Replicas** - Scaling reads

### Microservices & Distributed Systems
- [ ] **Microservices Architecture** - Benefits and challenges
- [ ] **Service Communication** - REST, gRPC, message queues
- [ ] **API Gateway** - Single entry point
- [ ] **Service Discovery** - Finding services dynamically
- [ ] **Circuit Breaker** - Handling failures
- [ ] **Event-Driven Architecture** - Message brokers (RabbitMQ, Kafka)
- [ ] **Saga Pattern** - Distributed transactions
- [ ] **CQRS** - Command Query Responsibility Segregation
- [ ] **Event Sourcing** - Storing state changes

### DevOps & Deployment
- [ ] **Docker Basics** - Containers, images, Dockerfile
- [ ] **Docker Compose** - Multi-container applications
- [ ] **CI/CD** - Continuous Integration/Deployment pipelines
- [ ] **GitHub Actions** - Automated workflows
- [ ] **Environment Management** - Dev, staging, production
- [ ] **Logging** - Winston, Morgan, centralized logging
- [ ] **Monitoring** - Application performance monitoring (APM)
- [ ] **Health Checks** - Readiness, liveness probes
- [ ] **Blue-Green Deployment** - Zero-downtime deployments
- [ ] **Kubernetes Basics** - Orchestration (bonus)

### Testing
- [ ] **Unit Testing** - Jest, Mocha, Chai
- [ ] **Integration Testing** - Testing API endpoints
- [ ] **Mocking** - Mocking databases, external APIs
- [ ] **Test Coverage** - Measuring test effectiveness
- [ ] **TDD** - Test-Driven Development
- [ ] **E2E Testing** - Supertest, end-to-end flows
- [ ] **Load Testing** - Apache JMeter, k6

### Advanced Node.js
- [ ] **Event Loop** - How it works, phases
- [ ] **Streams** - Readable, Writable, Transform, Duplex
- [ ] **Buffers** - Binary data handling
- [ ] **Child Processes** - Spawning processes
- [ ] **Clustering** - Multi-core utilization
- [ ] **Memory Leaks** - Detection and prevention
- [ ] **Profiling** - Performance profiling tools
- [ ] **Error Stack Traces** - Debugging in production

### Real-time & WebSockets
- [ ] **WebSockets** - Bidirectional communication
- [ ] **Socket.io** - Real-time events
- [ ] **Server-Sent Events (SSE)** - One-way streaming
- [ ] **Long Polling** - Alternative to WebSockets
- [ ] **Pub/Sub Patterns** - Message broadcasting

### Advanced Security
- [ ] **OWASP Top 10** - Common vulnerabilities
- [ ] **Rate Limiting Advanced** - Token bucket, sliding window
- [ ] **API Keys Management** - Rotation, revocation
- [ ] **Secrets Management** - Vault, AWS Secrets Manager
- [ ] **Content Security Policy** - CSP headers
- [ ] **Penetration Testing** - Security audits
- [ ] **Zero Trust Architecture** - Security model

### Message Queues & Async Processing
- [ ] **Message Queues** - RabbitMQ, AWS SQS, Redis Queue
- [ ] **Job Scheduling** - Cron jobs, Bull queue
- [ ] **Background Jobs** - Email sending, file processing
- [ ] **Dead Letter Queues** - Failed message handling
- [ ] **Pub/Sub Patterns** - Event broadcasting

---

## 4️⃣ SYSTEM DESIGN (Must Know)

### Scalability
- [ ] **Horizontal vs Vertical Scaling**
- [ ] **Stateless Applications**
- [ ] **Load Balancer Types** - L4 vs L7
- [ ] **Database Scaling** - Read replicas, sharding
- [ ] **Caching Layers** - Application, database, CDN

### High Availability
- [ ] **Redundancy** - Eliminating single points of failure
- [ ] **Failover Mechanisms** - Automatic failover
- [ ] **Disaster Recovery** - Backup strategies
- [ ] **Health Monitoring** - Uptime tracking

### Common System Design Questions
- [ ] **Design a URL Shortener** - Like bit.ly
- [ ] **Design a Rate Limiter**
- [ ] **Design a Chat Application**
- [ ] **Design a File Storage System** - Like Dropbox
- [ ] **Design a Notification System**
- [ ] **Design an API Gateway**
- [ ] **Design a Caching System**

---

## 5️⃣ BEHAVIORAL & CODING CHALLENGES

### Data Structures & Algorithms (DSA)
- [ ] **Arrays** - Manipulation, searching, sorting
- [ ] **Strings** - Manipulation, pattern matching
- [ ] **Hash Tables/Maps** - Key-value operations
- [ ] **Linked Lists** - Traversal, reversal
- [ ] **Stacks & Queues** - LIFO, FIFO operations
- [ ] **Trees** - Binary trees, BST, traversals
- [ ] **Graphs** - BFS, DFS
- [ ] **Sorting Algorithms** - Quick, Merge, Bubble
- [ ] **Searching Algorithms** - Binary search
- [ ] **Time & Space Complexity** - Big O notation

### Common Coding Problems
- [ ] **Two Sum Problem**
- [ ] **Reverse a String**
- [ ] **Palindrome Check**
- [ ] **FizzBuzz**
- [ ] **Fibonacci Sequence**
- [ ] **Anagram Check**
- [ ] **Find Duplicates in Array**
- [ ] **Merge Sorted Arrays**
- [ ] **Valid Parentheses**
- [ ] **Maximum Subarray Sum**

### Behavioral Questions
- [ ] **Tell me about yourself**
- [ ] **Why backend development?**
- [ ] **Describe a challenging project**
- [ ] **How do you handle tight deadlines?**
- [ ] **Conflict resolution with team members**
- [ ] **Learning new technologies**
- [ ] **Debugging difficult bugs**
- [ ] **Code review experiences**
- [ ] **Failure and learning from it**
- [ ] **Where do you see yourself in 5 years?**

---

## 6️⃣ PRACTICAL SKILLS TO DEMONSTRATE

### Your Urban Cap Project - Be Ready to Discuss:
- [ ] **Architecture** - Why you chose this structure
- [ ] **Database Schema** - Design decisions
- [ ] **Authentication Flow** - How JWT/session works
- [ ] **Error Handling** - Your approach
- [ ] **Validation** - Input validation strategy
- [ ] **Security Measures** - What you implemented
- [ ] **Testing** - Test coverage, approach
- [ ] **API Design** - RESTful principles followed
- [ ] **Performance** - Any optimizations made
- [ ] **Scalability** - How would you scale this?
- [ ] **Improvements** - What would you do differently?
- [ ] **Challenges Faced** - Problems and solutions

### Live Coding Expectations
- [ ] Build a simple REST API endpoint
- [ ] Implement authentication middleware
- [ ] Write database queries
- [ ] Debug existing code
- [ ] Explain your thought process
- [ ] Handle edge cases
- [ ] Write tests for your code

---

## 7️⃣ STUDY RESOURCES

### Documentation
- Node.js Official Docs
- Express.js Documentation
- MongoDB/PostgreSQL Docs
- MDN Web Docs (JavaScript)

### Practice Platforms
- LeetCode (DSA)
- HackerRank (Backend challenges)
- Exercism (Code practice)
- CodeWars

### Books (Optional)
- "Node.js Design Patterns" by Mario Casciaro
- "You Don't Know JS" series
- "Clean Code" by Robert C. Martin
- "Designing Data-Intensive Applications" by Martin Kleppmann

### YouTube Channels
- Traversy Media
- Fireship
- Hussein Nasser (Backend engineering)
- Tech With Tim

---

## 8️⃣ INTERVIEW PREPARATION CHECKLIST

### Before Interview
- [ ] Review your GitHub projects thoroughly
- [ ] Practice explaining your code verbally
- [ ] Prepare STAR format stories (Situation, Task, Action, Result)
- [ ] Research the company and their tech stack
- [ ] Prepare questions to ask the interviewer
- [ ] Test your internet/equipment for virtual interviews
- [ ] Have your resume ready to reference

### During Interview
- [ ] Think out loud while coding
- [ ] Ask clarifying questions
- [ ] Discuss trade-offs in your decisions
- [ ] Admit when you don't know something
- [ ] Show willingness to learn
- [ ] Be enthusiastic about technology
- [ ] Take notes if needed

### After Interview
- [ ] Send thank-you email within 24 hours
- [ ] Note down questions you struggled with
- [ ] Study topics you were weak in
- [ ] Follow up appropriately

---

## 9️⃣ TIMELINE SUGGESTION

### Week 1-2: Basics Revision
- JavaScript fundamentals
- Node.js & Express basics
- HTTP & REST

### Week 3-4: Intermediate Topics
- Advanced JavaScript concepts
- Authentication & authorization
- Database operations
- API design

### Week 5-6: Advanced Topics
- Design patterns
- Performance optimization
- System design basics
- Testing

### Week 7-8: Practice & Polish
- DSA problems (1-2 daily)
- Mock interviews
- Project refinement
- Behavioral question practice

### Ongoing
- Build side projects
- Contribute to open source
- Read tech blogs
- Stay updated with industry trends

---

## 🎯 KEY INTERVIEW SUCCESS TIPS

1. **Master the Fundamentals** - Don't skip basics for advanced topics
2. **Build Real Projects** - Theory + Practice = Success
3. **Explain Like You're Teaching** - Clear communication matters
4. **Know Your Own Code** - Be ready to defend every decision
5. **Practice System Design** - Draw diagrams, think at scale
6. **Stay Calm** - It's okay to take a moment to think
7. **Be Honest** - Don't fake knowledge you don't have
8. **Show Growth Mindset** - Emphasize learning ability
9. **Prepare Questions** - Show genuine interest in the role
10. **Follow Up** - Persistence and professionalism matter

---

## 📌 MOST COMMONLY ASKED QUESTIONS

### Technical
1. Explain the event loop in Node.js
2. Difference between REST and GraphQL
3. How does JWT authentication work?
4. What are middleware in Express?
5. Explain Promise vs async/await
6. How would you handle authentication in an API?
7. What is the difference between SQL and NoSQL?
8. How do you prevent SQL injection?
9. Explain CORS and how to handle it
10. What are HTTP status codes you use most?

### Scenario-Based
1. How would you design a scalable REST API?
2. Your API is slow - how do you debug it?
3. How would you handle file uploads?
4. Database is getting slow - what do you do?
5. How would you implement real-time features?
6. Explain your error handling strategy
7. How do you ensure API security?
8. How would you test your backend?
9. Explain a time you optimized performance
10. How do you handle database migrations?

---

**Good luck with your interviews! 🚀**

Remember: Consistency beats intensity. Study a little every day rather than cramming everything at once.