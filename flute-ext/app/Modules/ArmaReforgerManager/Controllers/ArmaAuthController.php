<?php

namespace Flute\Modules\ArmaReforgerManager\Controllers;

use Flute\Core\Support\BaseController;

class ArmaAuthController extends BaseController
{
    public function login()
    {
        return view('arma-reforger::pages.login');
    }
}


