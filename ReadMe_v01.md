# CakeBites

## Mobile Cake-Ordering Application

## Academic Project Report

## Abstract

CakeBites is a mobile commerce application developed to support digital cake ordering through a structured customer and administrator workflow. The project was built using Expo and React Native for the frontend, while Supabase was used to provide authentication, database services, storage, realtime updates, and edge-function support. The system enables customers to browse products, select cake sizes, add items to a cart, place orders, and observe order progress. It also provides an administrative environment for product management and operational order tracking.

This project demonstrates the practical development of a modern mobile application supported by a cloud backend. It also illustrates how sprint-based development can be applied to move a system from initial setup to a more advanced state that includes authentication, data persistence, realtime synchronization, and payment integration. The report outlines the purpose of the system, the technologies used, the sprint stages completed, the current level of system maturity, the challenges identified, and the recommended future development path.

## 1. Introduction

The increasing use of mobile applications in commerce has created opportunities for small businesses to improve the way they interact with customers. In the bakery and food-ordering space, many businesses still rely on manual methods such as walk-in orders, phone calls, or messaging platforms. Although these approaches may work at a small scale, they often lead to inefficiency, inconsistent record keeping, delayed communication, and poor visibility of order progress.

CakeBites was developed as a response to this problem. The system is designed to provide a mobile platform through which customers can browse cake options, select sizes, place orders, and track order progress, while administrators can manage available products and update the state of customer orders. The project also serves an academic purpose by demonstrating how a software system can be planned, implemented, and evaluated through iterative sprint stages.

The report presents CakeBites not only as a software artifact, but also as a learning project that demonstrates practical software engineering principles, including modular frontend design, backend integration, role-based access control, realtime synchronization, and payment workflow coordination.

## 2. Background and Problem Statement

Many small and medium-sized food businesses face operational challenges when handling customer orders manually. Common issues include:

- Difficulty keeping records of customer requests
- Poor visibility over active, completed, and cancelled orders
- Delays in updating customers about order progress
- Limited control over product availability and stock presentation
- Weak integration between ordering activity and payment handling

In such environments, customers may not know whether their order has been accepted or how far it has progressed, while administrators may struggle to manage products and workflow efficiently. This creates a need for a centralized digital system that supports both customer convenience and business administration.

CakeBites addresses this problem by introducing a mobile ordering workflow backed by a cloud database and administrative tools. The system is intended to reduce manual friction, improve order visibility, and provide a stronger foundation for reliable service delivery.

## 3. Aim of the Project

The aim of the project is to design and implement a mobile cake-ordering application that allows customers to place and monitor orders while enabling administrators to manage products and order progression through a centralized digital platform.

## 4. Project Objectives

The project objectives are:

- To develop a mobile application with a clear and usable cake-ordering interface
- To implement user registration and secure sign-in functionality
- To provide different access experiences for customers and administrators
- To support product browsing, product details, and size-based pricing
- To implement cart and order placement workflows
- To connect the application to a backend for persistent data storage
- To support realtime updates for key operational data
- To introduce online payment handling
- To organize development into identifiable sprint stages for evaluation

## 5. Scope of the Project

The scope of CakeBites includes the following functional areas:

- Customer registration and authentication
- Customer browsing of cake products
- Product selection by size and quantity
- Cart management
- Order creation and storage
- Delivery option capture
- Customer order history
- Administrator product management
- Administrator order management
- Product image storage
- Realtime product and order updates
- Payment transaction recording and checkout initiation

The project currently focuses on core mobile ordering functionality and does not yet fully include advanced analytics, production-hardened payment verification, large-scale automated testing, or complete deployment lifecycle documentation.

## 6. Significance of the Project

The significance of CakeBites can be considered from both practical and educational perspectives.

### 6.1 Practical Significance

From a practical point of view, the system demonstrates how a small cake business could transition from informal order handling to a structured digital process. The application introduces better visibility of products, clearer management of order stages, and a more organized interaction between customers and administrators.

### 6.2 Educational Significance

From an educational point of view, the project is valuable because it demonstrates:

- Mobile application design with component-based architecture
- Full-stack development using a managed backend platform
- Use of typed data models with TypeScript
- Integration of authentication, database, storage, and realtime features
- Incremental delivery of features through sprint-based development
- The relationship between user experience, backend design, and business logic

## 7. Development Methodology

CakeBites was developed using an iterative sprint-based approach. Rather than attempting to implement the entire system at once, the project progressed through multiple stages, with each stage focusing on a specific set of deliverables. This method allowed the system to evolve gradually from a simple application structure into a more complete mobile commerce solution.

The sprint-based approach was appropriate because:

- It made the project easier to manage
- It allowed features to be tested and refined incrementally
- It made it possible to identify new requirements as the system matured
- It supported continuous improvement across frontend, backend, and operational areas

The development pattern observed in the repository shows a progression from layout and navigation, to product interaction, to authentication and order management, and finally to infrastructure refinement and payment handling.

## 8. System Architecture Overview

CakeBites follows a client-cloud architecture.

### 8.1 Frontend Layer

The frontend was developed with Expo and React Native. Expo Router was used to organize screen-based navigation, while reusable components and providers were used to manage shared application logic such as authentication, cart state, and query handling.

### 8.2 Backend Layer

Supabase acts as the backend platform and provides:

- User authentication
- PostgreSQL-based relational storage
- Storage buckets for media files
- Realtime subscriptions for selected tables
- Edge functions for backend actions such as payment processing

### 8.3 Data Flow

The system generally follows this flow:

1. The user interacts with the mobile interface.
2. The application sends requests to Supabase services.
3. Supabase stores or retrieves data from the database.
4. Realtime updates are pushed back into the application where applicable.
5. Payment-related actions are coordinated through edge functions and payment transaction records.

This architecture is suitable for educational development because it exposes both frontend and backend concepts without requiring a fully self-hosted server from the beginning.

## 9. Technology Stack

The major technologies used in the project are listed below.

### 9.1 Expo and React Native

These technologies were used to build the mobile user interface and screen interactions. They allowed the project to follow a modern component-based architecture and support mobile development efficiently.

### 9.2 Expo Router

Expo Router enabled file-based navigation and route grouping. This helped separate authentication routes, customer routes, and administrator routes in a clear manner.

### 9.3 TypeScript

TypeScript improved the reliability of the codebase by enforcing clearer data structures and reducing errors that might occur through weak typing.

### 9.4 Supabase

Supabase was used for:

- Authentication
- Database management
- Storage
- Realtime subscriptions
- Edge functions

This choice simplified backend integration while still exposing important engineering concepts such as migrations, schema updates, and service integration.

### 9.5 React Query

React Query was used for server-state management. It supported better data fetching, cache control, and query invalidation after create, update, and delete operations.

## 10. Features Implemented

The current version of CakeBites includes the following features:

- User sign-up and sign-in
- Customer and administrator route separation
- Product listing and detail display
- Size-based pricing for products
- Cart management
- Order creation
- Order item persistence
- Delivery option support
- Customer order history
- Administrator order monitoring
- Order status transition handling
- Product image support
- Realtime data subscriptions
- Local Supabase support for development
- Payment transaction tracking
- Yoco checkout flow integration

Together, these features reflect a meaningful application workflow rather than a purely conceptual interface.

## 11. Sprint Stages Completed

The project development can be grouped into a number of sprint stages. These stages reflect how the application evolved over time.

### 11.1 Sprint 1: Project Setup and Navigation Foundation

This sprint established the technical foundation of the application. The project structure was initialized, and the routing layout was prepared so that future features could be added systematically.

Key outputs:

- Expo project initialization
- Source-code folder structuring
- Base navigation setup
- Shared component preparation

Contribution to the system:

This sprint created the underlying architecture on which all other features were built.

### 11.2 Sprint 2: Product Catalog and Browsing Interface

This sprint introduced the customer-facing product experience. The application began to function as a storefront rather than a simple project shell.

Key outputs:

- Product listing screen
- Product detail view
- Product presentation layout

Contribution to the system:

This stage enabled users to discover available products and established the visual basis for the ordering process.

### 11.3 Sprint 3: Cart and Purchase Preparation Logic

This sprint introduced core commerce behavior by allowing users to prepare orders through item selection and cart management.

Key outputs:

- Cart workflow
- Quantity handling
- Product size selection
- Size-based pricing logic

Contribution to the system:

This stage transformed the project from a catalog into a transactional application.

### 11.4 Sprint 4: Administrator Product Management

This sprint introduced administrative control over the product catalog.

Key outputs:

- Administrator route structure
- Product creation workflow
- Stock and availability logic
- Soft-delete or out-of-stock presentation behavior

Contribution to the system:

This stage made the system manageable from an operational perspective rather than relying on fixed data.

### 11.5 Sprint 5: Authentication and Profile Integration

This sprint focused on identity management and route protection.

Key outputs:

- Sign-up and sign-in support
- Supabase authentication integration
- Profile creation and fetching
- Role/group-based access handling

Contribution to the system:

This stage made it possible to distinguish customers from administrators and protect application workflows accordingly.

### 11.6 Sprint 6: Order Processing Workflow

This sprint introduced persistent order management.

Key outputs:

- Order insertion
- Order-item persistence
- Customer order history
- Administrator order lists and details
- Active and archived order views
- Controlled order status progression

Contribution to the system:

This stage established the application as a structured order-processing platform.

### 11.7 Sprint 7: Backend Maturity and Realtime Support

This sprint strengthened the backend environment and improved responsiveness.

Key outputs:

- Database migration growth
- Storage bucket support
- Product image upload handling
- Realtime subscriptions for products and orders
- Modular subscription logic
- Local Supabase setup for development

Contribution to the system:

This stage improved maintainability, backend realism, and the responsiveness of the application.

### 11.8 Sprint 8: Stability Improvements and Payment Integration

This sprint focused on refining system behavior and adding payment support.

Key outputs:

- UI and theme refinement
- Loading and buffering improvements
- Network-related fixes
- Payment transaction schema introduction
- Yoco checkout integration
- Payment state linked to order state

Contribution to the system:

This stage moved the project closer to a real commerce environment by connecting ordering behavior with transaction handling.

## 12. Results and Current System Status

The current version of CakeBites demonstrates that the project has achieved several important results:

- A customer can authenticate and access the application
- A customer can browse available products and select different sizes
- A customer can add items to a cart and create an order
- Orders are stored and displayed back to the user
- An administrator can manage products and observe order activity
- Order progress is represented using controlled status updates
- Product and order data can respond to realtime changes
- Payment transaction records are created and linked to the order workflow

These outcomes show that the application functions as a meaningful end-to-end prototype with substantial backend integration.

## 13. Challenges Encountered

Like many software projects, CakeBites reflects both achievements and ongoing challenges. The following technical and project-level challenges are evident from the current system state.

### 13.1 Payment Verification Reliability

Although payment integration has been introduced, the project still needs stronger production-grade verification patterns such as webhook-driven confirmation. This is important because return URLs alone are not sufficient for secure financial state confirmation.

### 13.2 Security Hardening

The project uses a practical development setup, but some areas will require stronger row-level security refinement before production deployment, especially around sensitive payment and transaction-related records.

### 13.3 Testing Coverage

The repository currently shows limited formal automated testing. This means that parts of the application depend heavily on manual verification, which is risky as the system grows in complexity.

### 13.4 Production Readiness

Although the application is functionally mature in several areas, full production readiness still requires stronger deployment discipline, environment separation, release procedures, and operational documentation.

## 14. Evaluation of the Project

From an academic and engineering point of view, CakeBites can be evaluated positively in the following ways:

- It demonstrates clear progression from foundation to advanced features
- It integrates frontend and backend concerns effectively
- It shows evidence of iterative development through sprint evolution
- It addresses a realistic business problem
- It applies modern tools and frameworks in a coherent way

However, a balanced evaluation must also recognize that:

- The payment system requires stronger verification and security controls
- The testing strategy needs expansion
- Reporting and analytics are still limited
- Deployment readiness is not yet fully formalized

This evaluation suggests that the project is strong as a working academic system and prototype, while still having room to mature further into a production-ready platform.

## 15. Recommended Future Work

The following future work is recommended for the next stages of the project.

### 15.1 Payment Hardening and Security

Recommended actions:

- Introduce webhook-based payment verification
- Improve row-level security policies for sensitive tables
- Strengthen duplicate-payment and retry handling
- Improve failure-state recording for transactions

Expected benefit:

This will improve trustworthiness, transaction correctness, and production suitability.

### 15.2 Testing and Quality Assurance

Recommended actions:

- Add unit tests for pricing, cart, and order logic
- Add integration tests for order placement and payment flow
- Add regression tests for administrator operations
- Introduce a formal QA checklist

Expected benefit:

This will improve confidence in correctness and reduce the risk of regressions.

### 15.3 Reporting and Analytics

Recommended actions:

- Add dashboard metrics for orders and revenue
- Add product popularity tracking
- Add filtering and search for administrative views

Expected benefit:

This will improve the system's business usefulness and support decision-making.

### 15.4 Customer Experience Improvements

Recommended actions:

- Improve saved customer profile and delivery information
- Add clearer error and recovery flows
- Introduce notifications or order alerts
- Improve user feedback messages and empty states

Expected benefit:

This will make the application easier and more pleasant to use.

### 15.5 Deployment and Maintenance Readiness

Recommended actions:

- Separate development, staging, and production environments
- Formalize deployment procedures
- Expand operational documentation
- Prepare the system for mobile distribution and maintenance

Expected benefit:

This will support long-term sustainability and professional deployment practice.

## 16. Educational Lessons Learned

The CakeBites project demonstrates several lessons that are valuable in software engineering education:

- Building a strong project structure early makes later feature work easier
- Authentication and authorization should be planned carefully in multi-role systems
- Relational data modeling is critical in order-based applications
- Realtime features improve operational visibility but increase architectural complexity
- Payment integration requires both UI coordination and backend discipline
- Iterative sprint development supports manageable growth of complex systems

These lessons show that the project is useful not only for its final functionality, but also for the knowledge gained during its development.

## 17. Conclusion

CakeBites is a substantial academic and practical software project that demonstrates the development of a mobile cake-ordering platform using modern frontend and backend technologies. The system has progressed from a basic project structure to a feature-rich application that includes product browsing, role-based access, cart functionality, order processing, realtime updates, and payment integration.

The completed sprint stages show clear and meaningful development progress. The project already serves as a credible example of applied mobile commerce development. Its next major priorities should focus on payment hardening, stronger testing, improved security, and more formal deployment preparation. With those improvements, CakeBites would move from being a strong prototype and academic project toward a more dependable production-oriented system.

## 18. Suggested Academic Use of This Report

This document can be used as:

- A project overview chapter
- A software development progress report
- A capstone or coursework supporting document
- A foundation for a final report chapter on implementation and evaluation
