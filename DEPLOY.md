# FLOW Backend - EC2 Deployment Guide (Simple IP Setup)

## Architecture

```
    Your Laptop / Vercel Frontend
            │
            │ HTTP / WebSocket
            ▼
    ┌──────────────────────────────┐
    │        EC2 Instance          │
    │                              │
    │  ┌──────────┐  ┌──────────┐ │
    │  │ Jenkins  │  │  Nginx   │ │  (Optional)
    │  │  :8080   │  │  :80     │ │
    │  └──────────┘  └──────────┘ │
    │                              │
    │  ┌────────────────────────┐ │
    │  │    Docker Compose      │ │
    │  │  ┌──────────────────┐  │ │
    │  │  │   Gateway :3000  │  │ │  ← Public API
    │  │  └────────┬─────────┘  │ │
    │  │           │            │ │
    │  │  ┌────────┴─────────┐  │ │
    │  │  │  Monolith :4000  │  │ │  ← Internal only
    │  │  └────┬──────┬──────┘  │ │
    │  │       │      │         │ │
    │  │  ┌────┘      └────┐    │ │
    │  │  │ MongoDB :27017 │    │ │  ← Internal only
    │  │  │ Redis   :6379  │    │ │  ← Internal only
    │  │  └────────────────┘    │ │
    │  └────────────────────────┘ │
    │                              │
    │  ┌────────────────────────┐ │
    │  │   Realtime :3005       │ │  ← Public WebSocket
    │  └────────────────────────┘ │
    └──────────────────────────────┘
```

**Security Group (AWS):**

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP only | SSH |
| 3000 | 0.0.0.0/0 | Gateway API (public) |
| 3005 | 0.0.0.0/0 | Realtime Socket.io (public) |
| 8080 | Your IP only | Jenkins (optional) |

**Internal only (bind to 127.0.0.1):** 4000 (Monolith), 27017 (MongoDB), 6379 (Redis)

---

## Prerequisites

### 1. Launch EC2 Instance

- **Instance type:** `t3.medium` (2 vCPU, 4GB RAM) minimum
- **OS:** Ubuntu 22.04 LTS
- **Storage:** 30GB SSD
- **Security group:** Open ports 22, 3000, 3005 (8080 optional for Jenkins)

### 2. Install Docker & Docker Compose

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose curl -y
sudo usermod -aG docker ubuntu
newgrp docker

docker --version
docker-compose --version
```

### 3. Install Jenkins (Optional)

If you want Jenkins on the same EC2:

```bash
# Install Java
sudo apt install openjdk-17-jre-headless -y

# Add Jenkins repo
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

# Install Jenkins
sudo apt update
sudo apt install jenkins -y
sudo usermod -aG docker jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Jenkins runs on port 8080
# Get initial password: sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

---

## Setup

### Step 1: Create Deployment Directory

```bash
mkdir -p /home/ubuntu/flow-backend
cd /home/ubuntu/flow-backend
```

### Step 2: Create .env File (ONE TIME)

```bash
# Generate secrets
INTERNAL_API_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -base64 64)

# Create .env file
cat > .env << EOF
NODE_ENV=production
INTERNAL_API_KEY=${INTERNAL_API_KEY}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=*
MONGO_URI=mongodb://mongodb:27017
REDIS_URL=redis://redis:6379
CLOUDINARY_URL=cloudinary://YOUR_KEY:YOUR_SECRET@YOUR_CLOUD_NAME
FMCSA_API_KEY=
EOF

# View it
cat .env
```

**Get Cloudinary URL:**
1. Sign up at https://cloudinary.com
2. Go to Dashboard → API Keys
3. Copy the "API Environment Variable" - it looks like: `cloudinary://123456789:abcdefghij@yourcloud`

### Step 3: Copy docker-compose.yml

```bash
# From your local machine (or git clone on EC2)
scp -i your-key.pem FLOW_Backend/backend/docker-compose.yml ubuntu@YOUR_EC2_IP:/home/ubuntu/flow-backend/

# OR if you cloned repo on EC2:
# cp /path/to/repo/FLOW_Backend/backend/docker-compose.yml /home/ubuntu/flow-backend/
```

### Step 4: Build & Start (Manual)

```bash
cd /home/ubuntu/flow-backend

# Build images
docker-compose build

# Start everything
docker-compose up -d

# Check status
docker-compose ps

# Health checks
curl http://localhost:3000/health
curl http://localhost:3000/api/health
curl http://localhost:3005/health
```

---

## Jenkins Pipeline Setup

### 1. Install Jenkins Plugins

Go to **Manage Jenkins → Plugins → Available:**
- Docker Pipeline
- Git
- Pipeline

### 2. Create Pipeline Job

1. **New Item → Pipeline**
2. Name: `flow-backend-deploy`
3. Under **Pipeline**, select: **Pipeline script from SCM**
4. SCM: **Git**
5. Repository URL: `https://github.com/YOUR_USERNAME/YOUR_REPO.git`
6. Script Path: `FLOW_Backend/backend/Jenkinsfile`
7. Save

### 3. Run Build

Click **Build Now**. Jenkins will:
1. Pull code
2. Install deps
3. TypeScript check
4. Build Docker images
5. Deploy with docker-compose
6. Health checks

---

## Update Frontend to Use EC2 IP

In your frontend `.env.local` or Vercel env vars:

```env
NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:3000
NEXT_PUBLIC_REALTIME_URL=http://YOUR_EC2_PUBLIC_IP:3005
```

Replace `YOUR_EC2_PUBLIC_IP` with your actual IP (e.g., `3.145.67.89`).

---

## Common Operations

### View Logs
```bash
cd /home/ubuntu/flow-backend

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f monolith
docker-compose logs -f gateway
docker-compose logs -f realtime
```

### Restart Services
```bash
cd /home/ubuntu/flow-backend

# Restart all
docker-compose restart

# Restart one service
docker-compose restart gateway
```

### Update Env Vars
```bash
cd /home/ubuntu/flow-backend
nano .env

# After editing, restart:
docker-compose restart
```

### Update Code & Redeploy
```bash
# If using git on EC2:
cd /path/to/repo
git pull

# Then rebuild:
cd /home/ubuntu/flow-backend
docker-compose down
docker-compose up -d --build
```

Or trigger Jenkins build.

### Stop Everything
```bash
cd /home/ubuntu/flow-backend
docker-compose down
```

### Clean Up Docker
```bash
# Remove old images
docker image prune -af

# Remove unused volumes
docker volume prune -f
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Connection refused` to :3000 | Check `docker-compose ps`, ensure gateway is running |
| CORS errors from frontend | Update `CORS_ORIGINS` in `.env` to your frontend URL |
| `JWT verification failed` | Ensure same `JWT_SECRET` in all services (it's one `.env` file) |
| MongoDB not starting | Check logs: `docker-compose logs mongodb` |
| Out of disk space | `docker system prune -af` |
| Jenkins can't run docker | `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins` |

---

## When You Get a Domain Later

1. Buy domain, point A record to EC2 IP
2. Install Nginx + Certbot for SSL
3. Update `CORS_ORIGINS` in `.env`:
   ```env
   CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```
4. Restart: `docker-compose restart`

No code changes needed!
