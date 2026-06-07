FROM docker.io/library/php:8.3-cli-alpine

# Install system dependencies
RUN apk add --no-cache \
    libxml2-dev \
    oniguruma-dev \
    sqlite-dev \
    git \
    unzip \
    libzip-dev

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_sqlite \
    xml \
    dom \
    mbstring \
    zip

# Install Composer
COPY --from=docker.io/library/composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app
