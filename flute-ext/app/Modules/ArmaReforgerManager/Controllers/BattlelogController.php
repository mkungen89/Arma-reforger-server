<?php

namespace Flute\Modules\ArmaReforgerManager\Controllers;

use Flute\Core\Support\BaseController;

class BattlelogController extends BaseController
{
    public function index()
    {
        return view('arma-reforger::pages.battlelog');
    }
}


