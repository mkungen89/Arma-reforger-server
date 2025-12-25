<?php

namespace Flute\Modules\ArmaReforgerManager\Controllers;

use Flute\Core\Support\BaseController;

class ArmaModsController extends BaseController
{
    public function index()
    {
        return view('arma-reforger::pages.mods');
    }
}
