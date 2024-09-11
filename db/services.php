<?php

/**
 * Quiz Proctoring external functions and service definitions.
 *
 * @package    mod_quiz
 */
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

$functions = array(
    'quizaccess_quizproctoring_save_threshold_warning' => array(
        'classname'     => 'quizaccess_quizproctoring_external',
        'methodname'    => 'save_threshold_warning',
        'description'   => 'Save Threshold Warning',
        'type'          => 'write',
        'capabilities'  => '',
        'ajax'          => true
    ),
);

// We define the services to install as pre-build services. A pre-build service is not editable by administrator.
$services = array(
    'Proctoring web service'  => array(
        'functions' => array (
            'quizaccess_quizproctoring_save_threshold_warning',
        ),
        'enabled' => 1,
        'restrictedusers' => 0,
        'shortname' => PROCTORING_WEB_SERVICE,
        'downloadfiles' => 1,
        'uploadfiles' => 1
    ),
);
