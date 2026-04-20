# ServiceHub Backend

ServiceHub Backend is a production-ready **Node.js** backend built for a multi-role service platform supporting **customers, vendors, and administrators**. The system handles secure authentication, wallet-based payments, vendor payouts with admin approval, and exposes a fully documented REST API using Swagger (OpenAPI 3.0).

The project follows a modular architecture with a clear separation between routes, controllers, services, and documentation, making it scalable and easy to maintain.

---

## 🚀 Features

- 🔐 **Secure Auth:** JWT-based authentication and Role-Based Access Control (RBAC).
- 👥 **Multi-role System:** Custom workflows for Customers, Vendors, and Admins.
- 💰 **Wallet Management:** Internal balance tracking and wallet-based transactions.
- 🏦 **Vendor Payouts:** Controlled withdrawal flows with mandatory admin approval.
- 🔥 **Firebase Integration:** Uses Firebase Admin SDK for secure third-party services.
- 🌐 **RESTful APIs:** Clean, predictable resource-based endpoints.
- 🧩 **Modular Architecture:** Scalable structure with domain-based endpoints.

---

## 🛠 Tech Stack

- **Node.js & Express.js** - Core server framework.
- **MongoDB / SQL** - Flexible database support (configurable).
- **Firebase Admin SDK** - Third-party service integration.
- **JWT** - Secure user authorization.
- **Swagger (OpenAPI 3.0)** - Modular API documentation.

---

## 📦 Installation

```bash
# Clone the repository
git clone [https://github.com/akashpatelknit/ServiceHub-Backend.git](https://github.com/akashpatelknit/ServiceHub-Backend.git)

# Navigate to the project directory
cd ServiceHub-Backend

# Install dependencies
npm install