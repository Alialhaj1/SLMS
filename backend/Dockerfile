FROM node:18

# Install PostgreSQL client tools (pg_dump, psql) for backup functionality
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Create backup directory
RUN mkdir -p /backups && chmod 755 /backups

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
