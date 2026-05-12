# Environment Variable Configuration for Jenkins Deployment

## Overview

When deploying via Jenkins, environment variables are configured in **ONE central `.env` file on EC2**, not in the Git repo. Docker Compose automatically loads this file and distributes variables to each service.

```
Jenkins Pipeline
    │
    ├─ Builds Docker images (uses no env vars at build time)
    ├─ Copies docker-compose.yml + deploy.sh to EC2
    └─ Runs deploy.sh on EC2
            │
            └─ deploy.sh reads /home/ubuntu/flow-backend/.env
                    │
                    ├─ Monolith  gets: MONGO_URI, REDIS_URL, INTERNAL_API_KEY, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, CLOUDINARY_URL, etc.
                    ├─ Gateway   gets: INTERNAL_API_KEY, JWT_PUBLIC_KEY, CORS_ORIGINS
                    └─ Realtime  gets: REDIS_URL, JWT_SECRET, CORS_ORIGINS
```

---

## Where Each Variable Lives

### 1. EC2 Server: `/home/ubuntu/flow-backend/.env`

**This file is created ONCE manually on EC2.** It is NOT in Git.

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Create the env file
cd /home/ubuntu/flow-backend
cp .env.example .env
nano .env
```

Fill in real values:
```env
# Shared secrets
INTERNAL_API_KEY=your-64-char-random-string
CORS_ORIGINS=https://yourdomain.com

# Monolith
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
CLOUDINARY_URL=cloudinary://key:secret@cloud
FMCSA_API_KEY=your-fmcsa-key

# Realtime
JWT_SECRET=your-64-char-secret
```

**This file persists across deployments.** Jenkins never overwrites it.

---

### 2. docker-compose.yml (Docker-internal networking)

These are hardcoded in docker-compose because they're Docker container-to-container URLs:

```yaml
monolith:
  environment:
    MONGO_URI: mongodb://mongodb:27017    # Docker service name
    REDIS_URL: redis://redis:6379         # Docker service name

gateway:
  environment:
    MONOLITH_URL: http://monolith:4000/api  # Docker service name

realtime:
  environment:
    REDIS_URL: redis://redis:6379         # Docker service name
```

These are NOT secrets — they're Docker network addresses.

---

### 3. Jenkins Credentials (for pipeline only)

These are used by Jenkins to SSH into EC2 and push Docker images:

| Credential ID | Used For |
|---------------|----------|
| `docker-hub-credentials` | Push images to Docker Hub |
| `ec2-host` | EC2 public IP address |
| `ec2-user` | SSH username (`ubuntu`) |
| `ec2-ssh-key` | SSH private key (.pem file) |

**These are NOT application env vars** — they're infrastructure credentials.

---

## Variable Mapping by Service

### Monolith (port 4000, internal only)
| Variable | Source | Purpose |
|----------|--------|---------|
| `MONGO_URI` | docker-compose.yml | MongoDB connection |
| `REDIS_URL` | docker-compose.yml | Redis connection |
| `INTERNAL_API_KEY` | `.env` file | Gateway auth |
| `JWT_PRIVATE_KEY` | `.env` file | Token signing |
| `JWT_PUBLIC_KEY` | `.env` file | Token verification |
| `CLOUDINARY_URL` | `.env` file | File uploads |
| `FMCSA_API_KEY` | `.env` file | Carrier verification |
| `CORS_ORIGINS` | `.env` file | CORS policy |

### Gateway (port 3000, public)
| Variable | Source | Purpose |
|----------|--------|---------|
| `MONOLITH_URL` | docker-compose.yml | Proxy to monolith |
| `INTERNAL_API_KEY` | `.env` file | Monolith auth |
| `JWT_PUBLIC_KEY` | `.env` file | Token verification |
| `CORS_ORIGINS` | `.env` file | CORS policy |

### Realtime (port 3005, public)
| Variable | Source | Purpose |
|----------|--------|---------|
| `REDIS_URL` | docker-compose.yml | Pub/sub events |
| `JWT_SECRET` | `.env` file | Socket auth |
| `CORS_ORIGINS` | `.env` file | CORS policy |

### MongoDB & Redis
| Variable | Source | Purpose |
|----------|--------|---------|
| `MONGO_INITDB_DATABASE` | docker-compose.yml | Default DB name |
| None for Redis | — | No auth by default |

---

## First-Time EC2 Setup

### Step 1: Create `.env` file manually

```bash
ssh -i key.pem ubuntu@YOUR_EC2_IP
mkdir -p /home/ubuntu/flow-backend
cd /home/ubuntu/flow-backend

# Generate secrets
openssl rand -hex 32 > .internal_api_key
openssl rand -base64 64 > .jwt_secret

# Create .env from template
nano .env
```

### Step 2: Generate JWT Keys

```bash
# On your local machine or EC2
ssh-keygen -t rsa -b 2048 -m PEM -f jwt.key -N ""

# Copy keys into .env file format
cat jwt.key      # Copy this as JWT_PRIVATE_KEY
cat jwt.key.pub  # Copy this as JWT_PUBLIC_KEY
rm jwt.key jwt.key.pub
```

### Step 3: Run Jenkins Pipeline

After `.env` exists, every Jenkins build will:
1. Build new Docker images
2. Copy docker-compose.yml to EC2
3. Run deploy.sh
4. deploy.sh reads `.env` and starts containers

---

## Updating Env Vars

To change a variable:

```bash
ssh -i key.pem ubuntu@YOUR_EC2_IP
cd /home/ubuntu/flow-backend
nano .env

# Edit values, then restart
docker-compose -f docker-compose.yml restart
```

No need to run Jenkins pipeline for env var changes — just edit `.env` and restart.

---

## Security Notes

| Rule | Why |
|------|-----|
| `.env` is gitignored | Contains secrets |
| `.env` stays on EC2 | Persists across deployments |
| MongoDB/Redis bind to `127.0.0.1` | Not accessible from internet |
| Monolith binds to `127.0.0.1` | Only gateway can reach it |
| Gateway/Realtime bind to `0.0.0.0` | Public-facing APIs |
