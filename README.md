# ServiceHub Backend

ServiceHub Backend is a production-ready Node.js backend built for a multi-role service platform supporting customers, vendors, and administrators. The system handles secure authentication, wallet-based payments, vendor payouts with admin approval, and exposes a fully documented REST API using Swagger (OpenAPI 3.0).

The backend is implemented using Node.js and Express, supports MongoDB or SQL databases, uses JWT-based authentication, and integrates with Firebase Admin SDK for secure third-party services. All APIs follow RESTful principles and are documented using a modular YAML-based Swagger setup.

The project includes secure user authentication and authorization, role-based access control, wallet-based transactions, internal balance management, and controlled vendor withdrawal flows. API documentation is interactive and accessible through Swagger UI, allowing developers to explore endpoints, inspect request and response models, and test APIs directly from the browser.

Swagger UI is available after starting the server at:
http://localhost:3000/api-docs

The OpenAPI documentation follows a scalable structure with domain-based endpoints and reusable schemas:

src/docs/
├── swagger.yaml
├── paths/
│   ├── auth.yaml
│   ├── user.yaml
│   ├── booking.yaml
│   └── payment.yaml
└── schemas/
    ├── auth.yaml
    └── common.yaml

To run the project locally, clone the repository, install dependencies, configure environment variables, and start the server:

git clone https://github.com/akashpatelknit/ServiceHub-Backend.git
cd ServiceHub-Backend
npm install
npm run dev

The application runs on http://localhost:3000 and all APIs can be accessed and tested through the Swagger UI.

Environment configuration is managed using a .env file in the project root and typically includes the application port, JWT secret, database connection string, and Firebase configuration values.

The project follows a modular architecture with clear separation between routes, controllers, services, and documentation, making it scalable and easy to maintain. API contracts are centrally defined using Swagger schemas to ensure consistency across the system.

Author: Akash Patel  
GitHub: https://github.com/akashpatelknit

If you find this project useful, consider giving it a star on GitHub.
