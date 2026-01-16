<?php
// backend/routes/person_prefixes.routes.php
declare(strict_types=1);

require_once __DIR__ . '/../controllers/person_prefixes.controller.php';

/**
 * รองรับ:
 * GET    /person-prefixes?q=&page=&limit=
 * POST   /person-prefixes
 * PUT    /person-prefixes/{id}
 * DELETE /person-prefixes/{id}
 */
function person_prefixes_routes(string $method, array $segments, PDO $pdo): bool
{
    if (($segments[0] ?? '') !== 'person-prefixes') return false;

    $id = 0;
    if (isset($segments[1]) && ctype_digit((string)$segments[1])) {
        $id = (int)$segments[1];
    }

    $controller = new PersonPrefixesController($pdo);

    switch ($method) {
        case 'GET':
            $controller->list();
            return true;

        case 'POST':
            $controller->create();
            return true;

        case 'PUT':
            $controller->update($id); // id=0 ก็ได้ (controller resolve จาก query/body)
            return true;

        case 'DELETE':
            $controller->delete($id); // id=0 ก็ได้ (controller resolve จาก query/body)
            return true;

        default:
            fail('Method Not Allowed', 405);
            return true;
    }
}
