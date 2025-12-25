<?php

namespace Flute\Modules\ArmaReforgerManager\Controllers;

use Flute\Core\Support\BaseController;

class ArmaLogsController extends BaseController
{
    public function index()
    {
        return view('arma-reforger::pages.logs');
    }
}
