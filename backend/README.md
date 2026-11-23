# Pinspire API (Laravel)

REST API for Pinspire. See the [project README](../README.md) for setup, environment variables and the full endpoint reference.

```bash
composer install && cp .env.example .env && php artisan key:generate
php artisan migrate --seed && php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8000
```
