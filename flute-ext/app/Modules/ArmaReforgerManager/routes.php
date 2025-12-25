<?php

use Flute\Core\Router\Contracts\RouterInterface;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaDashboardController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaAuthController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaServerController;
use Flute\Modules\ArmaReforgerManager\Controllers\BattlelogController;

// Public Battlelog (Flute-themed) - uses Node public APIs
$router->get('/battlelog', [BattlelogController::class, 'index']);

// Arma manager pages (Flute-themed), auth is handled by Node token for now
$router->get('/arma', [ArmaDashboardController::class, 'index']);
$router->get('/arma/login', [ArmaAuthController::class, 'login']);
$router->get('/arma/server', [ArmaServerController::class, 'index']);


