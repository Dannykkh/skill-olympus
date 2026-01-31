# Backend Dockerfile Templates

## Standard (Python/FastAPI)

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Development stage
FROM python:3.11-slim as development
WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

COPY --chown=appuser:appuser . .
USER appuser
EXPOSE 8950

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8950", "--reload"]

# Production stage
FROM python:3.11-slim as production
WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY --chown=appuser:appuser . .
USER appuser
EXPOSE 8950

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8950/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8950", "--workers", "4"]
```

## With Cython (소스코드 보호)

```dockerfile
# Build stage - Cython compile
FROM python:3.11-slim as builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt cython

COPY . .

# Cython compile script
RUN python -c "
import os
from setuptools import setup
from Cython.Build import cythonize

py_files = []
for root, dirs, files in os.walk('app'):
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for f in files:
        if f.endswith('.py') and f not in ('__init__.py', 'main.py'):
            py_files.append(os.path.join(root, f))

if py_files:
    setup(ext_modules=cythonize(py_files, compiler_directives={'language_level': '3'}))
" build_ext --inplace

RUN find app -name "*.py" ! -name "main.py" ! -name "__init__.py" -delete
RUN find app -name "*.c" -delete

# Production stage
FROM python:3.11-slim as production
WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /home/appuser/.local
COPY --from=builder --chown=appuser:appuser /app/app /app/app

ENV PATH=/home/appuser/.local/bin:$PATH
USER appuser
EXPOSE 8950

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8950/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8950", "--workers", "4"]
```

## With PyArmor (난독화)

```dockerfile
# Build stage - PyArmor obfuscation
FROM python:3.11-slim as builder
WORKDIR /app

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt pyarmor

COPY . .
ENV PATH=/root/.local/bin:$PATH
RUN pyarmor gen --output dist/app app/

# Production stage
FROM python:3.11-slim as production
WORKDIR /app

RUN useradd --create-home --shell /bin/bash appuser
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /home/appuser/.local
COPY --from=builder --chown=appuser:appuser /app/dist/app /app/app

ENV PATH=/home/appuser/.local/bin:$PATH
USER appuser
EXPOSE 8950

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8950/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8950", "--workers", "4"]
```
