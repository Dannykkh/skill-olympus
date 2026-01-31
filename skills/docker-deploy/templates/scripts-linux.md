# Linux/Mac Scripts (.sh)

## docker-build-images.sh

```bash
#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  {Project} Docker Image Build"
echo "============================================"
echo ""

docker info > /dev/null 2>&1 || { echo "[ERROR] Docker is not running."; exit 1; }

mkdir -p docker-images

echo "[1/4] Building Backend API image..."
docker build -t {project}-api:latest -f backend/Dockerfile --target production backend/

echo "[2/4] Building Frontend image..."
docker build -t {project}-frontend:latest -f frontend/Dockerfile --target production frontend/

echo "[3/4] Saving images to tar file..."
docker save {project}-api:latest {project}-frontend:latest -o docker-images/{project}-all.tar

echo "[4/4] Copying deployment files..."
[ -f database/schema.sql ] && cp database/schema.sql docker-images/
[ -f database/migrate.sql ] && cp database/migrate.sql docker-images/

echo ""
echo "Build Complete! Output: docker-images/"
```

## docker-images/install.sh

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
MODE="${1:-install}"

echo ""
echo "============================================"
case "$MODE" in
    update) echo "  {Project} Update" ;;
    reset)  echo "  {Project} Reset" ;;
    *)      echo "  {Project} Install" ;;
esac
echo "============================================"

# Docker check
docker info > /dev/null 2>&1 || { echo "[ERROR] Docker not running."; exit 1; }

# Reset mode
if [ "$MODE" = "reset" ]; then
    read -p "Delete all data? (yes/no): " CONFIRM
    [ "$CONFIRM" != "yes" ] && { echo "Cancelled."; exit 0; }
    docker-compose down -v 2>/dev/null || true
fi
[ "$MODE" = "update" ] && docker-compose down 2>/dev/null || true
docker rmi {project}-api:latest {project}-frontend:latest 2>/dev/null || true

# Load images
if [ -f "$SCRIPT_DIR/{project}-all.tar" ]; then
    echo "Loading images..."
    docker load -i "$SCRIPT_DIR/{project}-all.tar"
else
    echo "[ERROR] {project}-all.tar not found."
    exit 1
fi

# Pull base images
docker image inspect mysql:8.0 > /dev/null 2>&1 || docker pull mysql:8.0
docker image inspect redis:7-alpine > /dev/null 2>&1 || docker pull redis:7-alpine

# Start services
docker-compose up -d

echo ""
echo "============================================"
echo "  Complete!"
echo "============================================"
echo "  Web: http://localhost:8960"
echo "  API: http://localhost:8950/docs"
```

## docker-images/update.sh

```bash
#!/bin/bash
"$(dirname "$0")/install.sh" update
```

## docker-images/reset.sh

```bash
#!/bin/bash
"$(dirname "$0")/install.sh" reset
```

## docker-images/logs.sh

```bash
#!/bin/bash
cd "$(dirname "$0")"
docker-compose logs -f
```

## docker-images/cleanup.sh

```bash
#!/bin/bash
echo "Cleaning Docker resources..."
docker container prune -f
docker image prune -f
docker volume prune -f
echo "Done!"
```
