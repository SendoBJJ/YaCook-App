# YaCook Production Deployment Guide

## Overview
YaCook is a modern nutrition and meal-planning app with React Native/Expo frontend and FastAPI backend. This guide covers production deployment.

## Architecture
```
[Web/Mobile Clients] → [Nginx/Cloudflare] → [FastAPI Backend] → [MongoDB]
                                         ↓
                                    [Static Files]
```

## Prerequisites
- Docker and Docker Compose
- Domain name (e.g., app.yacook.app)
- SSL certificate (Let's Encrypt recommended)
- MongoDB instance
- Cloudinary account (for media uploads)

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d app.yacook.app

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Environment Configuration

Copy the environment templates:
```bash
cp .env.frontend.production frontend/.env.production
cp .env.backend.production backend/.env.production
```

Update the following variables:
- `SECRET_KEY`: Generate strong JWT secret
- `MONGO_URL`: Your MongoDB connection string
- `CLOUDINARY_*`: Your Cloudinary credentials
- `CORS_ORIGINS`: Your production domain

### 4. Build Frontend

```bash
cd frontend
yarn install
yarn build:web

# Copy to nginx directory
sudo cp -r dist/* /var/www/yacook/
sudo chown -R www-data:www-data /var/www/yacook/
```

### 5. Configure Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/yacook
sudo ln -s /etc/nginx/sites-available/yacook /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Backend Deployment

#### Option A: Docker Deployment
```bash
# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
    depends_on:
      - mongodb
    restart: unless-stopped
    
  mongodb:
    image: mongo:6
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped
    
volumes:
  mongodb_data:
EOF

# Deploy
docker-compose up -d
```

#### Option B: Systemd Service
```bash
# Create service file
sudo tee /etc/systemd/system/yacook-backend.service << EOF
[Unit]
Description=YaCook Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/yacook/backend
Environment=PATH=/opt/yacook/backend/venv/bin
ExecStart=/opt/yacook/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable yacook-backend
sudo systemctl start yacook-backend
```

### 7. DNS Configuration

Point your domain to your server:
```
A record: app.yacook.app → YOUR_SERVER_IP
```

### 8. Health Checks

```bash
# Backend health
curl https://app.yacook.app/health

# Frontend
curl https://app.yacook.app/

# API endpoints
curl https://app.yacook.app/api/health
```

## Mobile App Builds

### Generate EAS Builds
```bash
cd frontend

# Configure EAS
npx eas build:configure

# Build for production
npx eas build --platform all --profile production

# Submit to stores
npx eas submit --platform all
```

## Monitoring & Logs

### Health Check Monitoring
```bash
# Add to crontab for health monitoring
*/5 * * * * curl -f https://app.yacook.app/health || echo "YaCook backend down" | mail admin@yacook.app
```

### Log Management
```bash
# Backend logs
sudo journalctl -u yacook-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB logs (if using Docker)
docker logs yacook_mongodb_1 -f
```

### Basic Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# System resources
htop
iotop
nethogs

# Disk usage
df -h
du -sh /var/www/yacook/
du -sh /var/lib/mongodb/
```

## Security Checklist

- [ ] SSL certificate installed and auto-renewing
- [ ] Strong JWT secret key generated
- [ ] MongoDB authentication enabled
- [ ] Firewall configured (UFW recommended)
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] CORS origins restricted to production domains

## Backup Strategy

```bash
# MongoDB backup
mongodump --out /backup/mongodb-$(date +%Y%m%d)

# Frontend files backup
tar -czf /backup/yacook-frontend-$(date +%Y%m%d).tar.gz /var/www/yacook/

# Backend code backup
tar -czf /backup/yacook-backend-$(date +%Y%m%d).tar.gz /opt/yacook/backend/
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `allow_origins` in backend configuration
   - Verify domain matches exactly (including https://)

2. **Database Connection**
   - Check MongoDB is running: `systemctl status mongod`
   - Verify connection string in `.env`

3. **Static Files Not Loading**
   - Check Nginx configuration
   - Verify file permissions: `ls -la /var/www/yacook/`

4. **API Routes 404**
   - Verify Nginx proxy_pass configuration
   - Check backend is running on port 8001

### Performance Optimization

1. **Database Indexing**
   ```python
   # Add to your MongoDB setup
   db.posts.createIndex({"created_at": -1})
   db.users.createIndex({"email": 1})
   db.notifications.createIndex({"to_user_id": 1, "created_at": -1})
   ```

2. **Nginx Caching**
   ```nginx
   # Add to nginx config
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Database Connection Pooling**
   - Configure appropriate connection pool sizes
   - Monitor connection usage

## Support

For deployment issues:
1. Check logs first
2. Verify all environment variables
3. Test each component independently
4. Review this deployment guide

Production deployment checklist completed when all health checks pass and monitoring is active.