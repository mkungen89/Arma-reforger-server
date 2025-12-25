<?php

use Flute\Core\Router\Contracts\RouterInterface;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaDashboardController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaAuthController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaServerController;
use Flute\Modules\ArmaReforgerManager\Controllers\BattlelogController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaPlayersController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaModsController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaSchedulerController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaBackupsController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaLogsController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaConfigController;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaUsersController;

// Public Battlelog (Flute-themed) - uses Node public APIs
$router->get('/battlelog', [BattlelogController::class, 'index']);

// Arma manager pages (Flute-themed), auth is handled by Node token for now
$router->get('/arma', [ArmaDashboardController::class, 'index']);
$router->get('/arma/login', [ArmaAuthController::class, 'login']);
$router->get('/arma/server', [ArmaServerController::class, 'index']);
$router->get('/arma/players', [ArmaPlayersController::class, 'index']);
$router->get('/arma/mods', [ArmaModsController::class, 'index']);
$router->get('/arma/scheduler', [ArmaSchedulerController::class, 'index']);
$router->get('/arma/backups', [ArmaBackupsController::class, 'index']);
$router->get('/arma/logs', [ArmaLogsController::class, 'index']);
$router->get('/arma/config', [ArmaConfigController::class, 'index']);
$router->get('/arma/users', [ArmaUsersController::class, 'index']);


