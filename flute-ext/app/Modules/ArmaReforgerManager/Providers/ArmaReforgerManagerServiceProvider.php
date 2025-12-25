<?php

namespace Flute\Modules\ArmaReforgerManager\Providers;

use DI\Container;
use Flute\Core\Support\AbstractServiceProvider;

class ArmaReforgerManagerServiceProvider extends AbstractServiceProvider
{
    public function register(\DI\ContainerBuilder $containerBuilder): void
    {
        // no-op
    }

    public function boot(Container $container): void
    {
        if (!is_installed()) {
            return;
        }

        // Views
        $this->addNamespace('arma-reforger', path('app/Modules/ArmaReforgerManager/views'));

        // Routes
        $this->loadRoutesFrom('app/Modules/ArmaReforgerManager/routes.php');
    }
}


