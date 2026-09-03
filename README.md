# Rinha de Backend 2026 — Fraud Detection via Vector Search

Implementation for the **Rinha de Backend 2026** challenge, focused on real-time fraud detection using vector search.

For each incoming card transaction, the application transforms the transaction data into a **14-dimensional vector**, searches for the five most similar reference transactions, and calculates a fraud score based on their labels.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 20
- **Language:** TypeScript
- **Framework:** Fastify
- **Vector Search:** Custom vector search implementation
- **Load Balancer:** Nginx
- **Containerization:** Docker & Docker Compose

---

## 🏗️ Architecture

The API runs in two instances behind an Nginx load balancer.

```text
                         ┌─────────────────┐
                         │      Nginx      │
                         │     :9999       │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
             ┌─────────────┐             ┌─────────────┐
             │    api01    │             │    api02    │
             │   Fastify   │             │   Fastify   │
             └──────┬──────┘             └──────┬──────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │   Reference Vectors    │
                     │     3M transactions     │
                     └────────────────────────┘
```

Nginx distributes requests between the two API instances using round-robin routing.

---

## 🔍 Fraud Detection Pipeline

Each request follows the same detection pipeline:

```text
Transaction
     │
     ▼
Normalization
     │
     ▼
14-dimensional vector
     │
     ▼
Nearest-neighbor search
     │
     ▼
5 most similar transactions
     │
     ▼
Fraud score
     │
     ▼
Approve / Deny
```

The fraud score is calculated as:

```text
fraud_score = fraud_neighbors / 5
```

A transaction is approved when:

```text
fraud_score < 0.6
```

Otherwise, it is denied.

---

## ⚙️ Implementation

### Vector Normalization

Incoming transaction data is converted into a **14-dimensional vector** according to the challenge normalization rules.

The implementation includes dedicated modules for this process:

- `normalization.ts` — transforms transaction data into the normalized vector.
- `vectorSearch.ts` — performs similarity search against the reference vectors.
- `server.ts` — exposes the HTTP API and coordinates the detection pipeline.

### Reference Dataset

The challenge provides a reference dataset containing **3,000,000 labeled transaction vectors**.

The dataset is used as the basis for nearest-neighbor searches and fraud classification.

---

## 📌 API Endpoints

### `GET /ready`

Health/readiness endpoint used to determine whether the API is ready to receive requests.

Returns a `2xx` response when ready.

### `POST /fraud-score`

Receives a card transaction and returns the fraud decision and calculated score.

Example:

```json
{
  "approved": false,
  "fraud_score": 0.8
}
```

---

## 🚀 Getting Started

### Prerequisites

- Docker
- Docker Compose
- Node.js 20

### 1. Install dependencies

```bash
npm install
```

### 2. Build the application

```bash
npm run build
```

The compiled JavaScript files are generated under `dist/`.

### 3. Start the environment

```bash
docker compose up --build -d
```

The API is exposed through Nginx on:

```text
http://localhost:9999
```

### 4. Check the containers

```bash
docker compose ps
```

---

## 📁 Project Structure

```text
.
├── dist/
│   ├── normalization.js
│   ├── server.js
│   └── vectorSearch.js
├── src/
│   ├── normalization.ts
│   ├── server.ts
│   └── vectorSearch.ts
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

---

## 📊 Challenge Constraints

The implementation follows the infrastructure requirements of the Rinha de Backend 2026:

- Two API instances behind a load balancer.
- Round-robin request distribution.
- API exposed on port `9999`.
- Maximum aggregate limit of **1 CPU** and **350 MB RAM**.
- Docker Compose deployment.
- `linux-amd64` compatibility.
- Bridge networking.

---

## 📄 License

MIT

## 👨‍💻 Author

**Leonardo Henrique de Oliveira Cavalhere**

Software Engineer
