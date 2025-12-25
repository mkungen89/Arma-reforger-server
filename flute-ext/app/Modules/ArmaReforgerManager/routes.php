<?php

use Flute\Core\Router\Contracts\RouterInterface;
use Flute\Modules\ArmaReforgerManager\Controllers\ArmaDashboardController;

router()->group(['middleware' => 'auth'], static function (RouterInterface $router) {
    $router->get('/arma', [ArmaDashboardController::class, 'index']);
});


